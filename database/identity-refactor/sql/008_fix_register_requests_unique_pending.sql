-- 008_fix_register_requests_unique_pending.sql
-- Hotfix: resolve 409 conflict on reject/approve caused by incorrect unique(email,status) constraint.

begin;

-- old constraint made every (email, status) unique, which blocks multiple rejected history rows
alter table public.register_requests
drop constraint if exists register_requests_email_pending_unique;

drop index if exists public.uq_register_requests_email_pending;

-- correct rule: only limit concurrent pending request per email
create unique index uq_register_requests_email_pending
  on public.register_requests(email)
  where status = 'pending';

commit;
