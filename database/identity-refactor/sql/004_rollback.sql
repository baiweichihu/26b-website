-- 004_rollback.sql
-- Identity refactor - rollback helpers

begin;

-- 1) restore dropped tables from backup snapshots (if needed)
-- WARNING: these statements assume backup tables exist.
create table if not exists public.upgrade_requests as
select * from public.upgrade_requests_backup_20260306 where false;

insert into public.upgrade_requests
select * from public.upgrade_requests_backup_20260306
where not exists (select 1 from public.upgrade_requests limit 1);

create table if not exists public.access_requests as
select * from public.access_requests_backup_20260306 where false;

insert into public.access_requests
select * from public.access_requests_backup_20260306
where not exists (select 1 from public.access_requests limit 1);

-- 2) re-add columns when missing
alter table public.profiles
add column if not exists identity_type text;

alter table public.admin_permissions
add column if not exists can_manage_journal boolean default false,
add column if not exists can_manage_user_permissions boolean default false;

alter table public.posts
add column if not exists visibility text default 'public';

commit;
