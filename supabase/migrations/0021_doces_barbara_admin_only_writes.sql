-- 0021 — Doces Bárbara: public may read, only admins may write
--
-- Doces Bárbara is a separate site (repo Denysmelo2/doces-barbara) that
-- shares this Supabase project. Live state on 17/10/2026:
--   * doces_barbara_availability_blocks: SELECT, INSERT and DELETE
--     policies all `true` for role public — anyone with the publishable
--     key could block or free any day in the calendar.
--   * bucket `doces-barbara-inspiration` (public): INSERT policy for
--     anon/authenticated scoped only by bucket_id — anyone could upload
--     up to 5 MB images to it, without limit.
--
-- Owner's decision: keep public READ; only a signed-in admin
-- (`is_admin()`, i.e. user_profiles.role = 'admin') may insert, update
-- or delete calendar rows, and upload, replace or delete images.
--
-- !! HOLD THIS MIGRATION until the doces app is changed. !!
-- That app writes both with the publishable key and no Supabase login:
--   * src/lib/availability.js blockDate()/unblockDate(), called from
--     AdminPage, which is protected only by a password compared in the
--     browser (VITE_ADMIN_PASSWORD, which ships inside the JS bundle).
--   * src/lib/uploadImage.js, called from the PUBLIC OrderForm, so a
--     customer can attach an inspiration photo to an order.
-- After this migration both fail with "new row violates row-level
-- security policy". The admin calendar needs a real Supabase sign-in
-- (supabase.auth.signInWithPassword) with an account whose
-- user_profiles.role is 'admin'. Customer uploads need another route
-- (for example an Edge Function that validates the file and issues a
-- signed upload URL), or the owner accepts that customers can no longer
-- attach photos.
--
-- storage.objects belongs to supabase_storage_admin; Supabase lets the
-- postgres role manage its policies. If CREATE POLICY on storage.objects
-- is refused here, create the three storage policies in Dashboard →
-- Storage → Policies with the same expressions and re-run the checks.
--
-- Rollback (re-opens public writes):
--   create policy "doces_barbara: insercao publica" on public.doces_barbara_availability_blocks
--     for insert to public with check (true);
--   create policy "doces_barbara: delecao publica" on public.doces_barbara_availability_blocks
--     for delete to public using (true);
--   grant insert, delete on public.doces_barbara_availability_blocks to anon;
--   create policy "doces_barbara_inspiration: upload publico" on storage.objects
--     for insert to anon, authenticated with check (bucket_id = 'doces-barbara-inspiration');

begin;

set local lock_timeout = '8s';

-- ── Calendar table ──────────────────────────────────────────────────
drop policy if exists "doces_barbara: insercao publica" on public.doces_barbara_availability_blocks;
drop policy if exists "doces_barbara: delecao publica" on public.doces_barbara_availability_blocks;
drop policy if exists "doces_barbara: admin insert" on public.doces_barbara_availability_blocks;
drop policy if exists "doces_barbara: admin update" on public.doces_barbara_availability_blocks;
drop policy if exists "doces_barbara: admin delete" on public.doces_barbara_availability_blocks;

create policy "doces_barbara: admin insert" on public.doces_barbara_availability_blocks
  for insert to authenticated with check (is_admin());
create policy "doces_barbara: admin update" on public.doces_barbara_availability_blocks
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "doces_barbara: admin delete" on public.doces_barbara_availability_blocks
  for delete to authenticated using (is_admin());

-- "doces_barbara: leitura publica" (SELECT, true) stays.
revoke insert, update, delete on public.doces_barbara_availability_blocks from anon;

-- ── Storage bucket ──────────────────────────────────────────────────
drop policy if exists "doces_barbara_inspiration: upload publico" on storage.objects;
drop policy if exists "doces_barbara_inspiration: admin insert" on storage.objects;
drop policy if exists "doces_barbara_inspiration: admin update" on storage.objects;
drop policy if exists "doces_barbara_inspiration: admin delete" on storage.objects;

create policy "doces_barbara_inspiration: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'doces-barbara-inspiration' and public.is_admin());
create policy "doces_barbara_inspiration: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'doces-barbara-inspiration' and public.is_admin())
  with check (bucket_id = 'doces-barbara-inspiration' and public.is_admin());
create policy "doces_barbara_inspiration: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'doces-barbara-inspiration' and public.is_admin());

-- "doces_barbara_inspiration: leitura publica" (SELECT) stays; the
-- bucket also stays public, so object URLs keep working.

-- ── Verify ──────────────────────────────────────────────────────────
do $$
declare
  bad text;
  n int;
begin
  -- No write policy on either object may let a non-admin through.
  select string_agg(tablename || '.' || policyname, ', ') into bad
  from pg_policies
  where ((schemaname = 'public' and tablename = 'doces_barbara_availability_blocks')
      or (schemaname = 'storage' and tablename = 'objects'
          and coalesce(qual, '') || coalesce(with_check, '') like '%doces-barbara-inspiration%'))
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and (coalesce(qual, 'is_admin()') !~ 'is_admin\(\)'
      or coalesce(with_check, 'is_admin()') !~ 'is_admin\(\)'
      or roles <> '{authenticated}');
  if bad is not null then
    raise exception 'doces write policy without the admin test: %', bad;
  end if;

  select count(*) into n
  from pg_policies
  where schemaname = 'public' and tablename = 'doces_barbara_availability_blocks'
    and cmd = 'SELECT' and qual = 'true';
  if n <> 1 then
    raise exception 'doces calendar lost its public read';
  end if;

  select count(*) into n
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
    and qual like '%doces-barbara-inspiration%';
  if n <> 1 then
    raise exception 'doces bucket lost its public read';
  end if;

  if has_table_privilege('anon', 'public.doces_barbara_availability_blocks', 'insert')
     or has_table_privilege('anon', 'public.doces_barbara_availability_blocks', 'delete') then
    raise exception 'anon still holds write grants on the doces calendar';
  end if;
end $$;

commit;
