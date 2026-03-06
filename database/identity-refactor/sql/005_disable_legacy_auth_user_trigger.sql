-- 005_disable_legacy_auth_user_trigger.sql
-- Hotfix for: "Database error saving new user" on signInWithOtp(shouldCreateUser=true)
-- Cause: legacy custom trigger on auth.users (usually public.handle_new_user)
-- still tries to insert into profiles.identity_type which has been dropped.

begin;

do $$
declare
  r record;
begin
  -- drop all auth.users triggers whose trigger function lives in public schema
  -- these are project custom triggers, not Supabase managed auth schema functions
  for r in
    select tg.tgname as trigger_name,
           pn.nspname as function_schema,
           p.proname as function_name
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = tg.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and not tg.tgisinternal
      and pn.nspname = 'public'
  loop
    execute format('drop trigger if exists %I on auth.users', r.trigger_name);
  end loop;
end
$$;

-- remove common leftover trigger functions (safe if absent)
drop function if exists public.handle_new_user() cascade;
drop function if exists public.on_auth_user_created() cascade;

commit;
