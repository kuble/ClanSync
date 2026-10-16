-- Exact attendance windows are opt-in. Existing QA reservations retain their day-based windows.
alter table public.balance_rooms add column rsvp_opens_at timestamptz;
alter table public.balance_rooms add constraint balance_room_attendance_window check (
  rsvp_opens_at is null or (kind='flash' and isfinite(rsvp_opens_at) and rsvp_opens_at<scheduled_at)
);
alter table public.clan_polls add column balance_room_id uuid unique references public.balance_rooms(id) on delete cascade;

create function private.sync_room_attendance_poll() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_poll uuid;
begin
  if new.rsvp_opens_at is null or new.status<>'scheduled' then
    update public.clan_polls set closed_at=clock_timestamp()
      where balance_room_id=new.id and closed_at is null;
    return new;
  end if;
  insert into public.clan_polls(clan_id,title,created_by,starts_at,deadline_at,balance_room_id)
    values(new.clan_id,new.title||' 참석 투표',new.created_by,new.rsvp_opens_at,new.scheduled_at,new.id)
    on conflict(balance_room_id) do update set title=excluded.title,starts_at=excluded.starts_at,
      deadline_at=excluded.deadline_at,closed_at=null
      where (clan_polls.title,clan_polls.starts_at,clan_polls.deadline_at,clan_polls.closed_at)
        is distinct from (excluded.title,excluded.starts_at,excluded.deadline_at,null::timestamptz);
  select id into v_poll from public.clan_polls where balance_room_id=new.id;
  insert into public.poll_options(poll_id,label,sort_order)
    values(v_poll,'참석',0),(v_poll,'불참',1) on conflict(poll_id,sort_order) do nothing;
  -- The host's existing participation and prior RSVP choices survive conversion and re-enabling.
  insert into public.poll_votes(poll_id,option_id,user_id)
    select v_poll,o.id,r.user_id from public.balance_room_rsvps r
    join public.poll_options o on o.poll_id=v_poll and o.sort_order=case r.response when 'going' then 0 else 1 end
    where r.room_id=new.id and r.response in ('going','no')
      and not exists(select 1 from public.poll_votes v where v.poll_id=v_poll and v.user_id=r.user_id);
  return new;
end $$;
revoke all on function private.sync_room_attendance_poll() from public,anon,authenticated;
create trigger sync_room_attendance_poll after insert or update of title,scheduled_at,status,rsvp_opens_at on public.balance_rooms
  for each row execute function private.sync_room_attendance_poll();

-- Preserve the legacy day-based RPC arguments for existing clients, while exposing an exact timestamp.
create function private.create_balance_room_with_attendance(p_clan_id uuid,p_kind text,p_title text,p_scheduled_at timestamptz,
  p_rsvp_days integer,p_repeat_every_days integer,p_rsvp_opens_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if p_rsvp_opens_at is not null and (p_kind<>'flash' or p_scheduled_at is null
    or p_scheduled_at<=clock_timestamp() or not isfinite(p_rsvp_opens_at)
    or p_rsvp_opens_at>=p_scheduled_at or p_rsvp_opens_at<date_trunc('minute',clock_timestamp())
    or p_rsvp_days is not null) then raise exception '투표 개설 시각은 현재부터 내전 시작 전까지 선택하세요.'; end if;
  result:=private.create_balance_room(p_clan_id,p_kind,p_title,p_scheduled_at,p_rsvp_days,p_repeat_every_days);
  if p_rsvp_opens_at is not null then
    update public.balance_rooms set rsvp_opens_at=p_rsvp_opens_at where id=(result->>'room_id')::uuid;
  end if;
  return result;
end $$;
revoke all on function private.create_balance_room_with_attendance(uuid,text,text,timestamptz,integer,integer,timestamptz) from public,anon;
grant execute on function private.create_balance_room_with_attendance(uuid,text,text,timestamptz,integer,integer,timestamptz) to authenticated,service_role;
drop function public.create_balance_room(uuid,text,text,timestamptz,integer,integer);
create function public.create_balance_room(p_clan_id uuid,p_kind text,p_title text,p_scheduled_at timestamptz default null,
  p_rsvp_days integer default null,p_repeat_every_days integer default null,p_rsvp_opens_at timestamptz default null) returns jsonb
language sql security invoker set search_path='' as $$
  select private.create_balance_room_with_attendance(p_clan_id,p_kind,p_title,p_scheduled_at,p_rsvp_days,p_repeat_every_days,p_rsvp_opens_at);
$$;
revoke all on function public.create_balance_room(uuid,text,text,timestamptz,integer,integer,timestamptz) from public,anon;
grant execute on function public.create_balance_room(uuid,text,text,timestamptz,integer,integer,timestamptz) to authenticated,service_role;

create function private.update_balance_room_with_attendance(p_clan_id uuid,p_room_id uuid,p_title text,
  p_scheduled_at timestamptz,p_rsvp_days integer,p_rsvp_opens_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.balance_rooms;
begin
  select * into r from public.balance_rooms where id=p_room_id and clan_id=p_clan_id for update;
  if not found or not private.can_manage_balance_room_as(p_room_id,auth.uid()) then
    raise exception '이 내전 방을 수정할 권한이 없습니다.' using errcode='42501'; end if;
  if r.status<>'scheduled' then raise exception '예약 중인 방만 수정할 수 있습니다.'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 80
    or p_scheduled_at is null or not isfinite(p_scheduled_at) or p_scheduled_at<=clock_timestamp()
    or (p_rsvp_days is not null and (r.kind<>'flash' or p_rsvp_days not between 1 and 30)) then
    raise exception '방 이름과 미래 예약 시각을 확인하세요.'; end if;
  if p_rsvp_opens_at is not null and (r.kind<>'flash' or not isfinite(p_rsvp_opens_at)
    or p_rsvp_opens_at>=p_scheduled_at or p_rsvp_days is not null
    or (p_rsvp_opens_at<date_trunc('minute',clock_timestamp()) and p_rsvp_opens_at is distinct from r.rsvp_opens_at)) then
    raise exception '투표 개설 시각은 현재부터 내전 시작 전까지 선택하세요.'; end if;
  update public.balance_rooms set title=btrim(p_title),scheduled_at=p_scheduled_at,
    rsvp_days=p_rsvp_days,rsvp_opens_at=p_rsvp_opens_at where id=r.id;
  if r.schedule_id is not null then
    update public.balance_room_schedules set title=btrim(p_title),next_run_at=p_scheduled_at+make_interval(days=>interval_days)
      where id=r.schedule_id and clan_id=p_clan_id;
  end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function private.update_balance_room_with_attendance(uuid,uuid,text,timestamptz,integer,timestamptz) from public,anon;
grant execute on function private.update_balance_room_with_attendance(uuid,uuid,text,timestamptz,integer,timestamptz) to authenticated,service_role;
drop function public.update_balance_room(uuid,uuid,text,timestamptz,integer);
create function public.update_balance_room(p_clan_id uuid,p_room_id uuid,p_title text,p_scheduled_at timestamptz,
  p_rsvp_days integer default null,p_rsvp_opens_at timestamptz default null) returns jsonb
language sql security invoker set search_path='' as $$
  select private.update_balance_room_with_attendance(p_clan_id,p_room_id,p_title,p_scheduled_at,p_rsvp_days,p_rsvp_opens_at);
$$;
revoke all on function public.update_balance_room(uuid,uuid,text,timestamptz,integer,timestamptz) from public,anon;
grant execute on function public.update_balance_room(uuid,uuid,text,timestamptz,integer,timestamptz) to authenticated,service_role;

create or replace function public.submit_clan_poll_vote(p_clan_id uuid,p_poll_id uuid,p_option_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare p public.clan_polls; r public.balance_rooms; v_room_id uuid; n integer; choice smallint;
begin
  if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then raise exception 'forbidden' using errcode='42501'; end if;
  select balance_room_id into v_room_id from public.clan_polls where id=p_poll_id and clan_id=p_clan_id;
  -- All linked writes lock room, then poll, matching reservation edits and early opening.
  if v_room_id is not null then
    select * into r from public.balance_rooms where id=v_room_id and clan_id=p_clan_id for update;
    if not found or r.status<>'scheduled' or r.rsvp_opens_at is null or r.scheduled_at<=clock_timestamp() then
      raise exception '참석 투표가 마감되었습니다.'; end if;
  end if;
  select * into p from public.clan_polls where id=p_poll_id and clan_id=p_clan_id for update;
  if not found or p.closed_at is not null or p.deadline_at<=clock_timestamp() then raise exception '종료된 투표입니다.'; end if;
  if p.starts_at>clock_timestamp() then raise exception '아직 시작하지 않은 투표입니다.'; end if;
  n:=cardinality(p_option_ids);
  if n is null or n<1 or (not p.multiple_choice and n<>1) or n<>(select count(distinct x) from unnest(p_option_ids) x)
    or n<>(select count(*) from public.poll_options where poll_id=p_poll_id and id=any(p_option_ids)) then raise exception '선택지가 올바르지 않습니다.'; end if;
  delete from public.poll_votes where poll_id=p_poll_id and user_id=auth.uid();
  insert into public.poll_votes(poll_id,option_id,user_id) select p_poll_id,x,auth.uid() from unnest(p_option_ids) x;
  if v_room_id is not null then
    select sort_order into choice from public.poll_options where id=p_option_ids[1] and poll_id=p.id;
    insert into public.balance_room_rsvps(room_id,user_id,response) values(v_room_id,auth.uid(),case choice when 0 then 'going' else 'no' end)
      on conflict(room_id,user_id) do update set response=excluded.response,updated_at=clock_timestamp();
  end if;
end $$;
revoke all on function public.submit_clan_poll_vote(uuid,uuid,uuid[]) from public,anon;
grant execute on function public.submit_clan_poll_vote(uuid,uuid,uuid[]) to authenticated;

create or replace function private.set_balance_room_rsvp(p_clan_id uuid,p_room_id uuid,p_response text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.balance_rooms; v_poll uuid; v_option uuid;
begin
  if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then
    raise exception '활동 중인 클랜원만 신청할 수 있습니다.' using errcode='42501'; end if;
  select * into r from public.balance_rooms where id=p_room_id and clan_id=p_clan_id for update;
  if not found or r.kind<>'flash' or (r.rsvp_days is null and r.rsvp_opens_at is null)
    or r.status<>'scheduled' or clock_timestamp()>=r.scheduled_at then raise exception '참여 신청을 받는 깜짝 내전이 아닙니다.'; end if;
  if p_response is null or p_response not in ('going','maybe','no') then raise exception '참여 응답을 확인하세요.'; end if;
  if r.rsvp_opens_at is not null then
    if p_response='maybe' then raise exception '참석 또는 불참을 선택하세요.'; end if;
    select p.id,o.id into v_poll,v_option from public.clan_polls p join public.poll_options o on o.poll_id=p.id
      where p.balance_room_id=r.id and o.sort_order=case p_response when 'going' then 0 else 1 end;
    if v_poll is null then raise exception '참석 투표를 찾을 수 없습니다.'; end if;
    perform public.submit_clan_poll_vote(p_clan_id,v_poll,array[v_option]);
  else
    if clock_timestamp()<r.scheduled_at-make_interval(days=>r.rsvp_days) then raise exception '참여 신청 기간 전입니다.'; end if;
    insert into public.balance_room_rsvps(room_id,user_id,response) values(p_room_id,auth.uid(),p_response)
      on conflict(room_id,user_id) do update set response=excluded.response,updated_at=clock_timestamp();
  end if;
  return jsonb_build_object('ok',true);
end $$;
