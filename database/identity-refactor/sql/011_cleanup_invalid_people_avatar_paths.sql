-- 011_cleanup_invalid_people_avatar_paths.sql
-- Fix noisy storage signed-url 500 caused by stale avatar_path values
-- where file no longer exists in storage.objects.

begin;

update public.people_profiles p
set avatar_path = null,
    updated_at = now()
where p.avatar_path is not null
  and not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'people-avatars'
      and o.name = p.avatar_path
  );

commit;
