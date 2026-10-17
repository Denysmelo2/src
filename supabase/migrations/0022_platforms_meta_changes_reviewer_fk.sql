-- 0022 — deleting a reviewer no longer blocks on platforms_meta_changes
--
-- `platforms_meta_changes.reviewed_by` references auth.users with the
-- default ON DELETE NO ACTION. Every other foreign key to auth.users in
-- public cascades or sets null (checked 17/10/2026), so this one alone
-- makes `auth.admin.deleteUser()` fail for anyone who has ever reviewed
-- a platform change — i.e. every admin. That blocks the right-to-erasure
-- flow (delete-account) and the admin clean-up.
--
-- SET NULL, not CASCADE: the review history is the audit trail of the
-- catalogue and must survive the person. `reviewed_at` and
-- `reviewer_note` stay; only the link to the deleted account goes.

begin;

set local lock_timeout = '8s';

alter table public.platforms_meta_changes
  drop constraint if exists platforms_meta_changes_reviewed_by_fkey;

alter table public.platforms_meta_changes
  add constraint platforms_meta_changes_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users (id) on delete set null;

do $$
declare
  n int;
begin
  select count(*) into n
  from pg_constraint con
  where con.contype = 'f'
    and con.confrelid = 'auth.users'::regclass
    and con.connamespace = 'public'::regnamespace
    and con.confdeltype not in ('c', 'n');
  if n <> 0 then
    raise exception '% foreign key(s) to auth.users would still block a user delete', n;
  end if;
end $$;

commit;
