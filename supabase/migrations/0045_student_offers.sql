-- 0045 — student discounts (Student Beans, UNiDAYS) and "I'm a student"
--
-- Handover 17/11/2026 (descontos de estudante), task 1. A user who ticks
-- "I'm a student" sees each store's student discount in search and in
-- /compare; nobody else sees anything. The percentages come from the
-- robots' daily read (snapgain-scraper, task 2) under the same rules as
-- every other offer: is_active + last_verified_at, hidden after 30 days
-- (src/lib/dataFreshness.js). No link and no code is stored.
--
-- 1. user_profiles.is_student. The user may change it on their own row:
--    INSERT/UPDATE granted on that ONE column, like onboarding_done and
--    last_alerts_seen_at (0007). role, subscription_status, plan,
--    stripe_*, trial_end, current_period_end, cancel_at stay unwritable
--    by `authenticated` — checked at the end.
-- 2. handle_new_user() also copies is_student from the signup metadata
--    (the signup checkbox sends it as user_metadata, so it lands even
--    when the email must be confirmed before there is a session). The
--    rest of the function is unchanged. is_student grants nothing, so a
--    user-writable source is fine here, unlike role (see 0007).
-- 3. public.student_offers: one row per store x platform. Read by anon and
--    authenticated when active (the number is not a secret; the site
--    decides who sees it); written only by the service role (robots).
-- 4. ops.data_freshness gains student_offers, so /admin and the 48-hour
--    alert (source-alert, WATCHED: studentbeans, unidays) see the robots.
--
-- rate_history is not used: it is fed only by the legacy cashback_rates
-- table and holds 0 rows; gift-card offers do not write there either.
--
-- Rollback (in this order):
--   1. re-run the two definitions below without the is_student lines
--      (handle_new_user) and without the student_offers branch
--      (ops.data_freshness);
--   2. drop table public.student_offers;
--   3. alter table public.user_profiles drop column is_student;

begin;

-- 1. "I'm a student" ------------------------------------------------------
alter table public.user_profiles
  add column if not exists is_student boolean not null default false;

grant insert (is_student), update (is_student) on public.user_profiles to authenticated;

-- 2. Signup checkbox -> profile ------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  signup_phone text;
  signup_student boolean;
BEGIN
  -- Pull phone from user_metadata (sent by client at signup)
  signup_phone := NULLIF(TRIM(new.raw_user_meta_data->>'phone'), '');
  -- "I'm a student" checkbox (0045); anything but true means false.
  signup_student := COALESCE(new.raw_user_meta_data->>'is_student', '') = 'true';

  INSERT INTO public.user_profiles (
    user_id,
    email,
    phone,
    role,
    onboarding_done,
    trial_end,
    is_student
  )
  VALUES (
    new.id,
    new.email,
    signup_phone,
    'user',
    false,
    now() + interval '7 days',
    signup_student
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
EXCEPTION
  -- If phone is duplicate (unique violation), STILL create the user
  -- profile, but with NULL phone. The frontend will detect the
  -- collision on the client side before signup goes through.
  WHEN unique_violation THEN
    INSERT INTO public.user_profiles (
      user_id, email, phone, role, onboarding_done, trial_end, is_student
    )
    VALUES (
      new.id, new.email, NULL, 'user', false, now() + interval '7 days', signup_student
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$function$;

-- 3. Student offers -------------------------------------------------------
create table if not exists public.student_offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  platform text not null check (platform in ('studentbeans', 'unidays')),
  discount_pct numeric not null check (discount_pct > 0 and discount_pct < 100),
  title text,
  channel text not null default 'online' check (channel in ('online', 'instore', 'both')),
  is_active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, platform)
);

comment on table public.student_offers is
  'Student discount per store and platform (Student Beans, UNiDAYS), from the daily robots. Shown only to users with user_profiles.is_student. No links or codes.';

create index if not exists student_offers_store_active_idx
  on public.student_offers (store_id) where is_active;

drop trigger if exists student_offers_set_updated_at on public.student_offers;
create trigger student_offers_set_updated_at
  before update on public.student_offers
  for each row execute function public.tg_set_updated_at();

alter table public.student_offers enable row level security;

revoke all on public.student_offers from anon, authenticated;
grant select on public.student_offers to anon, authenticated;
grant all on public.student_offers to service_role;

drop policy if exists student_offers_public_read on public.student_offers;
create policy student_offers_public_read on public.student_offers
  for select to anon, authenticated
  using (is_active);

-- 4. Freshness (/admin, source-alert) -------------------------------------
create or replace view ops.data_freshness as
 WITH fontes AS (
         SELECT 'cashback_offers'::text AS tabela,
            cashback_offers.platform AS fonte,
            count(*) AS ofertas,
            max(cashback_offers.last_verified_at) AS ultima_verificacao
           FROM public.cashback_offers
          WHERE cashback_offers.is_active
          GROUP BY cashback_offers.platform
        UNION ALL
         SELECT 'gift_card_offers'::text,
            gift_card_offers.platform,
            count(*) AS count,
            max(gift_card_offers.last_verified_at) AS max
           FROM public.gift_card_offers
          WHERE gift_card_offers.is_active
          GROUP BY gift_card_offers.platform
        UNION ALL
         SELECT 'point_offers'::text,
            point_offers.airline,
            count(*) AS count,
            max(point_offers.last_verified_at) AS max
           FROM public.point_offers
          WHERE point_offers.is_active
          GROUP BY point_offers.airline
        UNION ALL
         SELECT 'student_offers'::text,
            student_offers.platform,
            count(*) AS count,
            max(student_offers.last_verified_at) AS max
           FROM public.student_offers
          WHERE student_offers.is_active
          GROUP BY student_offers.platform
        )
 SELECT tabela,
    fonte,
    ofertas,
    ultima_verificacao,
    now() - ultima_verificacao AS idade,
        CASE
            WHEN ultima_verificacao IS NULL THEN 'nunca'::text
            WHEN ultima_verificacao > (now() - '8 days'::interval) THEN 'ok'::text
            WHEN ultima_verificacao > (now() - '30 days'::interval) THEN 'atrasado'::text
            ELSE 'parado'::text
        END AS estado
   FROM fontes
  ORDER BY ultima_verificacao NULLS FIRST;

-- Checks -------------------------------------------------------------------
do $$
declare
  bad text;
begin
  -- The user can write is_student and nothing privileged.
  if not has_column_privilege('authenticated', 'public.user_profiles', 'is_student', 'UPDATE') then
    raise exception 'authenticated cannot update is_student';
  end if;
  select string_agg(c, ', ') into bad
    from unnest(array['role', 'subscription_status', 'plan', 'stripe_customer_id',
                      'stripe_subscription_id', 'trial_end', 'current_period_end',
                      'cancel_at', 'email', 'phone']) as c
   where has_column_privilege('authenticated', 'public.user_profiles', c, 'UPDATE')
      or has_column_privilege('authenticated', 'public.user_profiles', c, 'INSERT')
      or has_column_privilege('anon', 'public.user_profiles', c, 'UPDATE');
  if bad is not null then
    raise exception 'user_profiles columns writable by clients: %', bad;
  end if;

  -- student_offers: read-only for clients, RLS on.
  if has_table_privilege('anon', 'public.student_offers', 'INSERT')
     or has_table_privilege('authenticated', 'public.student_offers', 'UPDATE')
     or has_table_privilege('authenticated', 'public.student_offers', 'DELETE') then
    raise exception 'student_offers is writable by clients';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.student_offers'::regclass) then
    raise exception 'student_offers has no RLS';
  end if;

  -- The freshness view still answers through source_freshness().
  perform 1 from public.source_freshness() limit 1;
end $$;

commit;
