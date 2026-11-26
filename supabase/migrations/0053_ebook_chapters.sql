-- 0053 — the ebook "Stop Losing Money" read inside the site, in /library
-- (handover docs/HANDOVER_CLAUDE_CODE_2026-11-26-ebook.md; owner, 26/11:
-- "Sim, abrir para assinantes").
--
-- The Cowork copied the 9 chapters from the "SnapGain Calculadoras"
-- project (table `chapters`) into ops.ebook_chapters_import. This copies
-- them into public.ebook_chapters, which the reader reads.
--
-- Who reads what:
--   * the table of contents (number and title of every chapter):
--     everyone, through public.ebook_toc() (the titles are not secret;
--     the page shows them with a padlock);
--   * chapter 1 (Introduction), whole: everyone, signed in or not
--     (handover task 3: non-subscribers read the Introduction);
--   * chapters 2 onwards: only who can see Pro content, the same rule as
--     src/hooks/useSubscription.js and ProtectedRoute, done in the
--     database (public.can_read_pro()):
--       subscription_status in ('active','trialing'),
--       or trial_end > now(),
--       or role = 'admin' (user_profiles).
--   * no writes by anon or authenticated (only the service role and the
--     migrations write).
--
-- The chapter HTML keeps the book's classes (.sg*), its tables, SVG
-- charts, videos and the cdn.gamma.app images; the site sanitizes it
-- with DOMPurify before showing it (src/lib/ebook.js).
--
-- After it is applied: select chapter_number, title, length(html_content)
-- from public.ebook_chapters order by 1;  -> 9 rows. Then
-- ops.ebook_chapters_import can be dropped (the Cowork does it).
--
-- Rollback:
--   drop function if exists public.ebook_toc(uuid, text);
--   drop table if exists public.ebook_chapters;
--   drop function if exists public.can_read_pro();

begin;

-- Same rule as useSubscription's isPremium plus isAdmin. SECURITY
-- DEFINER so it can read the caller's own profile row whatever the
-- user_profiles policies say; it only ever looks at auth.uid()'s row and
-- returns a yes or no. No user is "pro" when not signed in.
create or replace function public.can_read_pro()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and (
        p.subscription_status in ('active', 'trialing')
        or p.trial_end > now()
        or p.role = 'admin'
      )
  );
$function$;

revoke all on function public.can_read_pro() from public;
grant execute on function public.can_read_pro() to anon, authenticated;

comment on function public.can_read_pro() is
  'True when the signed-in user can see Pro content: active/trialing subscription, local trial not ended, or admin (0053; same rule as useSubscription).';

create table if not exists public.ebook_chapters (
  id uuid not null default gen_random_uuid() unique,
  product_id uuid not null,
  locale text not null default 'en',
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  html_content text not null,
  created_at timestamptz not null default now(),
  primary key (product_id, locale, chapter_number)
);

comment on table public.ebook_chapters is
  'Ebook chapters read in /library (0053). Chapter 1 is open to everyone; the rest only to Pro (can_read_pro()).';

-- Copy from the Cowork's import table, if it is there (a fresh database
-- built from the migrations has no ops.ebook_chapters_import).
do $$
begin
  if to_regclass('ops.ebook_chapters_import') is not null then
    insert into public.ebook_chapters (id, product_id, locale, chapter_number, title, html_content, created_at)
    select i.id, i.product_id, coalesce(i.locale, 'en'), i.chapter_number, i.title, i.html_content,
           coalesce(i.created_at, now())
    from ops.ebook_chapters_import i
    where i.product_id is not null
      and i.chapter_number is not null
      and i.title is not null
      and i.html_content is not null
    on conflict (product_id, locale, chapter_number) do update
      set title = excluded.title,
          html_content = excluded.html_content;
  end if;
end;
$$;

alter table public.ebook_chapters enable row level security;

revoke all on table public.ebook_chapters from anon, authenticated;
grant select on table public.ebook_chapters to anon, authenticated;

drop policy if exists ebook_chapters_read on public.ebook_chapters;
create policy ebook_chapters_read
  on public.ebook_chapters
  for select
  to anon, authenticated
  using (chapter_number = 1 or public.can_read_pro());

-- The table of contents for everyone: number and title only, never the
-- HTML. A function (not a view) so it does not open the table to
-- anyone; SECURITY DEFINER only to see the titles past the policy.
create or replace function public.ebook_toc(p_product_id uuid, p_locale text default 'en')
returns table (chapter_number integer, title text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select c.chapter_number, c.title
  from public.ebook_chapters c
  where c.product_id = p_product_id
    and c.locale = coalesce(p_locale, 'en')
  order by c.chapter_number;
$function$;

revoke all on function public.ebook_toc(uuid, text) from public;
grant execute on function public.ebook_toc(uuid, text) to anon, authenticated;

comment on function public.ebook_toc(uuid, text) is
  'Table of contents of an ebook (number and title), readable by everyone (0053).';

commit;
