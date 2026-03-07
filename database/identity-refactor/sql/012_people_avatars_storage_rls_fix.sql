-- 012_people_avatars_storage_rls_fix.sql
-- Fix storage signed URL 500 for people-avatars bucket by rebuilding storage.objects policies
-- without legacy identity_type dependencies.

begin;

-- Drop legacy or conflicting policies on storage.objects related to people-avatars / identity_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual, '') ILIKE '%people-avatars%'
        OR coalesce(with_check, '') ILIKE '%people-avatars%'
        OR coalesce(qual, '') ILIKE '%identity_type%'
        OR coalesce(with_check, '') ILIKE '%identity_type%'
      )
  LOOP
    EXECUTE format('drop policy if exists %I on storage.objects', r.policyname);
  END LOOP;
END
$$;

-- Read: any authenticated user can read people-avatars objects (PeopleCenter itself is login-gated)
create policy storage_people_avatars_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'people-avatars');

-- Insert: owner folder or superuser
create policy storage_people_avatars_insert_owner_or_superuser
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'people-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superuser'
    )
  )
);

-- Update: owner folder or superuser
create policy storage_people_avatars_update_owner_or_superuser
on storage.objects
for update
to authenticated
using (
  bucket_id = 'people-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superuser'
    )
  )
)
with check (
  bucket_id = 'people-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superuser'
    )
  )
);

-- Delete: owner folder or superuser
create policy storage_people_avatars_delete_owner_or_superuser
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'people-avatars'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superuser'
    )
  )
);

commit;
