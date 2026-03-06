-- 003_cleanup.sql
-- Identity refactor - cleanup phase

begin;

-- A) remove legacy posts RLS policies that still depend on deprecated fields
do $$
declare
	r record;
begin
	for r in
		select policyname
		from pg_policies
		where schemaname = 'public'
			and tablename = 'posts'
			and (
				coalesce(qual, '') ilike '%identity_type%'
				or coalesce(with_check, '') ilike '%identity_type%'
				or coalesce(qual, '') ilike '%visibility%'
				or coalesce(with_check, '') ilike '%visibility%'
			)
	loop
		execute format('drop policy if exists %I on public.posts', r.policyname);
	end loop;
end
$$;

-- 0) snapshots (table copies in same database; external dumps should be exported to /snapshots folder separately)
create table if not exists public.upgrade_requests_backup_20260306 as
select * from public.upgrade_requests;

create table if not exists public.access_requests_backup_20260306 as
select * from public.access_requests;

-- 1) drop deprecated tables
-- (run after confirming backups exported)
drop table if exists public.upgrade_requests cascade;
drop table if exists public.access_requests cascade;

-- 2) drop deprecated profile identity column
alter table public.profiles
drop column if exists identity_type;

-- 3) drop deprecated admin permission columns
alter table public.admin_permissions
drop column if exists can_manage_journal,
drop column if exists can_manage_user_permissions;

-- 4) announcements no longer target identity subsets
-- no schema change required for notifications table.

-- 5) posts are internal-only; remove visibility column
alter table public.posts
drop column if exists visibility;

commit;
