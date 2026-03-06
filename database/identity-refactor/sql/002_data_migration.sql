-- 002_data_migration.sql
-- Identity refactor - data migration phase

begin;

-- 1) remove identity label dependency from existing profiles data.
-- all existing profiles are internal users; no data rewrite required except column cleanup later.

-- 2) normalize posts visibility to internal-only behavior before dropping column.
-- Here we force all existing posts to public (internal readable).
update public.posts
set visibility = 'public'
where visibility is distinct from 'public';

commit;
