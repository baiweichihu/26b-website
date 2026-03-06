-- 人物归属变更审计表（Supabase SQL Editor 执行）

create table if not exists public.people_profile_owner_change_logs (
  id bigint generated always as identity primary key,
  people_profile_id uuid not null references public.people_profiles(id) on delete cascade,
  old_owner_user_id uuid references public.profiles(id) on delete set null,
  new_owner_user_id uuid references public.profiles(id) on delete set null,
  changed_by_user_id uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_people_owner_logs_profile_id
  on public.people_profile_owner_change_logs (people_profile_id);

create index if not exists idx_people_owner_logs_changed_at
  on public.people_profile_owner_change_logs (changed_at desc);

create index if not exists idx_people_owner_logs_changed_by
  on public.people_profile_owner_change_logs (changed_by_user_id);

create or replace function public.log_people_profile_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.owner_user_id is distinct from old.owner_user_id then
    insert into public.people_profile_owner_change_logs (
      people_profile_id,
      old_owner_user_id,
      new_owner_user_id,
      changed_by_user_id,
      changed_at
    )
    values (
      new.id,
      old.owner_user_id,
      new.owner_user_id,
      auth.uid(),
      timezone('utc', now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_people_profile_owner_change_log on public.people_profiles;

create trigger trg_people_profile_owner_change_log
after update of owner_user_id on public.people_profiles
for each row
execute function public.log_people_profile_owner_change();

alter table public.people_profile_owner_change_logs enable row level security;

grant select, insert on public.people_profile_owner_change_logs to authenticated;
grant usage, select on sequence public.people_profile_owner_change_logs_id_seq to authenticated;

drop policy if exists "superuser_select_owner_change_logs" on public.people_profile_owner_change_logs;
drop policy if exists "superuser_insert_owner_change_logs" on public.people_profile_owner_change_logs;

create policy "superuser_select_owner_change_logs"
on public.people_profile_owner_change_logs
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

create policy "superuser_insert_owner_change_logs"
on public.people_profile_owner_change_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
);
