alter table public.clans add column balance_auto_open_enabled boolean not null default true,
  add column balance_auto_open_minutes integer not null default 10 check(balance_auto_open_minutes between 1 and 1440);

create function private.update_balance_auto_open_settings(p_clan_id uuid,p_enabled boolean,p_minutes integer) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
    raise exception '운영진만 내전 관리 설정을 변경할 수 있습니다.' using errcode='42501'; end if;
  if p_enabled is null or p_minutes is null or p_minutes not between 1 and 1440 then
    raise exception '자동 생성 시점은 1~1440분으로 설정해 주세요.' using errcode='22023'; end if;
  update public.clans set balance_auto_open_enabled=p_enabled,balance_auto_open_minutes=p_minutes where id=p_clan_id;
  if not found then raise exception '클랜을 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function private.update_balance_auto_open_settings(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function private.update_balance_auto_open_settings(uuid,boolean,integer) to authenticated,service_role;
create function public.update_balance_auto_open_settings(p_clan_id uuid,p_enabled boolean,p_minutes integer) returns jsonb
language sql security invoker set search_path='' as $$ select private.update_balance_auto_open_settings(p_clan_id,p_enabled,p_minutes); $$;
revoke all on function public.update_balance_auto_open_settings(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.update_balance_auto_open_settings(uuid,boolean,integer) to authenticated,service_role;

-- Scope is optional for the worker; isolated regression runs never open other clans' reservations.
drop function public.materialize_balance_rooms(integer);
drop function private.materialize_balance_rooms(integer);
create function private.materialize_balance_rooms(p_limit integer default 50,p_clan_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_room record; v_result jsonb; v_opened integer:=0; v_cancelled integer:=0;
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Batch limit must be 1..100'; end if;
  if not pg_try_advisory_xact_lock(726041913) then return jsonb_build_object('opened',0,'cancelled',0); end if;
  for v_room in select r.id from public.balance_rooms r join public.clans c on c.id=r.clan_id
    where r.status='scheduled' and c.balance_auto_open_enabled and (p_clan_id is null or r.clan_id=p_clan_id)
      and r.scheduled_at<=clock_timestamp()+make_interval(mins=>c.balance_auto_open_minutes)
    order by r.scheduled_at,r.id limit p_limit for update of r skip locked
  loop
    v_result:=private.open_balance_room_internal(v_room.id,true);
    if (v_result->>'ok')::boolean then v_opened:=v_opened+1; else v_cancelled:=v_cancelled+1; end if;
  end loop;
  return jsonb_build_object('opened',v_opened,'cancelled',v_cancelled);
end $$;
revoke all on function private.materialize_balance_rooms(integer,uuid) from public,anon,authenticated;
grant execute on function private.materialize_balance_rooms(integer,uuid) to service_role;
create function public.materialize_balance_rooms(p_limit integer default 50,p_clan_id uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.materialize_balance_rooms(p_limit,p_clan_id); $$;
revoke all on function public.materialize_balance_rooms(integer,uuid) from public,anon,authenticated;
grant execute on function public.materialize_balance_rooms(integer,uuid) to service_role;
