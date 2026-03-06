-- 007_reject_rpc_no_direct_auth_delete.sql
-- Hotfix: make reject RPC update request status only.
-- Auth user deletion is handled by Edge Function with service-role API.

begin;

create or replace function public.reject_register_request_and_delete_auth(
  p_request_id uuid,
  p_handled_by uuid,
  p_reject_reason text default null
)
returns public.register_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.register_requests%rowtype;
begin
  if v_actor is null then
    raise exception '未认证用户不可执行该操作';
  end if;

  if p_handled_by is distinct from v_actor then
    raise exception 'handled_by 必须与当前登录用户一致';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_actor
      and p.role = 'superuser'
  ) then
    raise exception '仅 superuser 可执行该操作';
  end if;

  select *
  into v_request
  from public.register_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception '申请不存在';
  end if;

  if v_request.status <> 'pending' then
    raise exception '该申请已处理';
  end if;

  update public.register_requests
  set status = 'rejected',
      handled_by = p_handled_by,
      handled_at = now(),
      reject_reason = nullif(trim(coalesce(p_reject_reason, '')), ''),
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.reject_register_request_and_delete_auth(uuid, uuid, text) from public;
grant execute on function public.reject_register_request_and_delete_auth(uuid, uuid, text) to authenticated;

commit;
