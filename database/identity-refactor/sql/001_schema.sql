-- 001_schema.sql
-- Identity refactor - schema phase

begin;

-- 1) registration request table
create table if not exists public.register_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  email text not null,
  nickname text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  handled_by uuid null references public.profiles(id) on delete set null,
  handled_at timestamptz null,
  reject_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- only one pending request per email at any time
create unique index if not exists uq_register_requests_email_pending
  on public.register_requests(email)
  where status = 'pending';

create index if not exists idx_register_requests_status_created_at
  on public.register_requests(status, created_at desc);

create index if not exists idx_register_requests_email
  on public.register_requests(email);

create index if not exists idx_register_requests_auth_user_id
  on public.register_requests(auth_user_id);

-- keep updated_at fresh
create or replace function public.set_register_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_register_requests_updated_at on public.register_requests;
create trigger trg_register_requests_updated_at
before update on public.register_requests
for each row
execute function public.set_register_requests_updated_at();

-- 2) RLS (superuser-only read/write except requester insert)
alter table public.register_requests enable row level security;

-- requester can insert only self email-based request data (auth user id must match)
drop policy if exists register_requests_insert_self on public.register_requests;
create policy register_requests_insert_self
on public.register_requests
for insert
to authenticated
with check (
  auth.uid() = auth_user_id
  and status = 'pending'
  and handled_by is null
  and handled_at is null
  and reject_reason is null
);

-- superuser can read all
-- NOTE: assumes profiles.role is trusted source
 drop policy if exists register_requests_select_superuser on public.register_requests;
create policy register_requests_select_superuser
on public.register_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
);

-- superuser can update all
 drop policy if exists register_requests_update_superuser on public.register_requests;
create policy register_requests_update_superuser
on public.register_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
);

commit;
