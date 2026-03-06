-- 010_people_profiles_rls_fix.sql
-- Hotfix: remove legacy people-related RLS policies that still depend on profiles.identity_type.

begin;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('people_profiles', 'people_profile_owner_change_logs')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$$;

alter table public.people_profiles enable row level security;

-- authenticated users can read people profiles (PeopleCenter requires login already)
create policy people_profiles_select_authenticated
on public.people_profiles
for select
to authenticated
using (true);

-- only superuser can create profiles
create policy people_profiles_insert_superuser
on public.people_profiles
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

-- superuser can update any row; normal user can update own bound row only
create policy people_profiles_update_owner_or_superuser
on public.people_profiles
for update
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
)
with check (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
);

-- only superuser can delete profiles
create policy people_profiles_delete_superuser
on public.people_profiles
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superuser'
  )
);

-- owner change logs: superuser-only read
alter table public.people_profile_owner_change_logs enable row level security;

create policy people_owner_logs_select_superuser
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

commit;
