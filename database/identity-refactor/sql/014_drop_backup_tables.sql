-- 014_drop_backup_tables.sql
-- Final cleanup: remove temporary backup tables created in 003_cleanup.sql
-- Run this ONLY after confirming local snapshots are exported and rollback by backup tables is no longer needed.

begin;

drop table if exists public.upgrade_requests_backup_20260306 cascade;
drop table if exists public.access_requests_backup_20260306 cascade;

commit;
