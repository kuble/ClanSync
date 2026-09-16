-- Reservations are separate from actual sessions: session_date is the real
-- opening date. A room and its series share an id once the room opens.
create table public.balance_room_schedules (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_by uuid not null references public.users(id),
  interval_days integer not null check (interval_days between 1 and 365),
  next_run_at timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(id,clan_id)
);
create table public.balance_rooms (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  game_id uuid not null references public.games(id),
  kind text not null check (kind in ('regular','flash')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_by uuid not null references public.users(id),
  scheduled_at timestamptz not null default now(),
  status text not null default 'scheduled' check (status in ('scheduled','open','closed','cancelled')),
  series_id uuid unique,
  schedule_id uuid,
  rsvp_days integer check (rsvp_days between 1 and 30),
  delegated_to uuid references public.users(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  foreign key(series_id,clan_id,game_id) references public.balance_session_series(id,clan_id,game_id) on delete cascade,
  foreign key(schedule_id,clan_id) references public.balance_room_schedules(id,clan_id),
  check (series_id is null or series_id = id),
  check ((status in ('scheduled','cancelled') and series_id is null) or (status in ('open','closed') and series_id is not null)),
  check (kind = 'flash' or rsvp_days is null),
  check (kind = 'regular' or (schedule_id is null and delegated_to is null)),
  unique(schedule_id,scheduled_at)
);
create index balance_rooms_clan_time_idx on public.balance_rooms(clan_id,scheduled_at desc);
create index balance_rooms_due_idx on public.balance_rooms(scheduled_at) where status = 'scheduled';
create unique index balance_rooms_one_reservation_per_schedule_idx on public.balance_rooms(schedule_id) where status = 'scheduled' and schedule_id is not null;
create index balance_rooms_creator_idx on public.balance_rooms(created_by);
create index balance_rooms_delegate_idx on public.balance_rooms(delegated_to) where delegated_to is not null;
create index balance_room_schedules_clan_idx on public.balance_room_schedules(clan_id);
create index balance_room_schedules_creator_idx on public.balance_room_schedules(created_by);
create table public.balance_room_rsvps (
  room_id uuid not null references public.balance_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  response text not null check (response in ('going','maybe','no')),
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create index balance_room_rsvps_user_idx on public.balance_room_rsvps(user_id);
alter table public.balance_rooms enable row level security;
alter table public.balance_room_schedules enable row level security;
alter table public.balance_room_rsvps enable row level security;
revoke all on public.balance_rooms,public.balance_room_schedules,public.balance_room_rsvps from public,anon,authenticated;
grant select on public.balance_rooms,public.balance_room_schedules,public.balance_room_rsvps to authenticated;
grant all on public.balance_rooms,public.balance_room_schedules,public.balance_room_rsvps to service_role;
create policy balance_rooms_read on public.balance_rooms for select to authenticated
  using (public.is_active_clan_member(clan_id));
create policy balance_room_schedules_read on public.balance_room_schedules for select to authenticated
  using (public.is_active_clan_member(clan_id));
create policy balance_room_rsvps_read on public.balance_room_rsvps for select to authenticated
  using (exists(select 1 from public.balance_rooms r where r.id = room_id and public.is_active_clan_member(r.clan_id)));

insert into public.balance_rooms(id,clan_id,game_id,kind,title,created_by,scheduled_at,status,series_id,created_at,closed_at)
select id,clan_id,game_id,'regular','정규 내전',host_user_id,opened_at,
  case when closed_at is null then 'open' else 'closed' end,id,opened_at,closed_at
from public.balance_session_series;

drop index public.balance_session_series_one_open_per_clan_idx;
drop index public.balance_sessions_one_open_per_clan_idx;
create unique index balance_sessions_one_open_per_series_idx on public.balance_sessions(series_id) where closed_at is null;

-- Actor-parameter helpers are private and cannot be invoked by API clients.
create function private.can_manage_balance_room_as(p_room_id uuid,p_actor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.balance_rooms r join public.clan_members m
    on m.clan_id = r.clan_id and m.user_id = p_actor_id and m.status = 'active'
    where r.id = p_room_id and (m.role in ('leader','officer') or (r.kind = 'flash' and r.created_by = p_actor_id)));
$$;
create function private.can_manage_balance_round_as(p_round_id uuid,p_actor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.balance_sessions s where s.id = p_round_id
    and private.can_manage_balance_room_as(s.series_id,p_actor_id));
$$;
create function private.can_manage_balance_round(p_round_id uuid,p_clan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.balance_sessions s
    where s.id = p_round_id and s.clan_id = p_clan_id and private.can_manage_balance_round_as(s.id,auth.uid()));
$$;
create function public.can_manage_balance_round(p_round_id uuid,p_clan_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.can_manage_balance_round(p_round_id,p_clan_id);
$$;
create function private.can_manage_balance_room(p_room_id uuid,p_clan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.balance_rooms r
    where r.id = p_room_id and r.clan_id = p_clan_id and private.can_manage_balance_room_as(r.id,auth.uid()));
$$;
create function public.can_manage_balance_room(p_room_id uuid,p_clan_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.can_manage_balance_room(p_room_id,p_clan_id);
$$;

-- The existing legacy open RPC still performs its clan-wide gate. Its inserts
-- acquire a backlink too, including service fixtures and historical importers.
create function private.sync_balance_room_series() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.balance_rooms(id,clan_id,game_id,kind,title,created_by,scheduled_at,status,series_id,closed_at)
    values(new.id,new.clan_id,new.game_id,'regular','정규 내전',new.host_user_id,new.opened_at,
      case when new.closed_at is null then 'open' else 'closed' end,new.id,new.closed_at)
    on conflict(id) do update set series_id = excluded.series_id,status = excluded.status,closed_at = excluded.closed_at;
  elsif new.closed_at is not null and old.closed_at is null then
    update public.balance_rooms set status = 'closed',closed_at = new.closed_at,delegated_to = null where series_id = new.id;
  end if;
  return new;
end $$;
create trigger sync_balance_room_series after insert or update of closed_at on public.balance_session_series
for each row execute function private.sync_balance_room_series();

-- One next reservation per recurrence. Missed occurrences are skipped by
-- arithmetic, so recovery after downtime never creates an unbounded backlog.
create function private.queue_next_balance_room(p_schedule_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_schedule public.balance_room_schedules; v_at timestamptz; v_now timestamptz := clock_timestamp(); v_game uuid;
begin
  if p_schedule_id is null then return; end if;
  select * into v_schedule from public.balance_room_schedules where id = p_schedule_id for update;
  if not found or not v_schedule.enabled then return; end if;
  if exists(select 1 from public.balance_rooms where schedule_id = p_schedule_id and status = 'scheduled') then return; end if;
  v_at := v_schedule.next_run_at;
  if v_at <= v_now then
    v_at := v_at + make_interval(days => v_schedule.interval_days * (floor(extract(epoch from (v_now-v_at))/(v_schedule.interval_days*86400))::integer+1));
  end if;
  select game_id into v_game from public.clans where id = v_schedule.clan_id;
  insert into public.balance_rooms(clan_id,game_id,kind,title,created_by,scheduled_at,schedule_id)
  values(v_schedule.clan_id,v_game,'regular',v_schedule.title,v_schedule.created_by,v_at,p_schedule_id)
  on conflict(schedule_id,scheduled_at) do nothing;
  update public.balance_room_schedules set next_run_at = v_at + make_interval(days => interval_days) where id = p_schedule_id;
end $$;

-- Internal opening requires a locked room and an already authorized caller.
-- Automatic opening uses the creator's CURRENT membership, never stored roles.
create function private.open_balance_room_internal(p_room_id uuid,p_automatic boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.balance_rooms; v_role public.clan_member_role; v_host uuid; v_round uuid;
begin
  select * into v_room from public.balance_rooms where id = p_room_id for update;
  if not found then raise exception '내전 방을 찾을 수 없습니다.'; end if;
  if v_room.status = 'open' then return jsonb_build_object('ok',true,'room_id',v_room.id,'series_id',v_room.series_id); end if;
  if v_room.status <> 'scheduled' then raise exception '개장할 수 없는 내전 방입니다.'; end if;
  if p_automatic then
    select role into v_role from public.clan_members where clan_id = v_room.clan_id and user_id = v_room.created_by and status = 'active' for share;
    if v_role is null or (v_room.kind = 'regular' and v_role not in ('leader','officer')) then
      -- A cancelled reservation is visible in the lobby; no authority survives
      -- leaving the clan or losing the role required to create a regular room.
      update public.balance_rooms set status = 'cancelled',closed_at = clock_timestamp(),delegated_to = null where id = v_room.id;
      update public.balance_room_schedules set enabled = false where id = v_room.schedule_id;
      return jsonb_build_object('ok',false,'error','creator_no_longer_authorized','room_id',v_room.id);
    end if;
  end if;
  v_host := coalesce(auth.uid(),v_room.created_by);
  if v_room.delegated_to is not null and exists(select 1 from public.clan_members
    where clan_id = v_room.clan_id and user_id = v_room.delegated_to and role = 'officer' and status = 'active') then
    v_host := v_room.delegated_to;
  elsif v_room.delegated_to is not null then
    update public.balance_rooms set delegated_to = null where id = v_room.id;
  end if;
  insert into public.balance_session_series(id,clan_id,game_id,host_user_id)
    values(v_room.id,v_room.clan_id,v_room.game_id,v_host);
  insert into public.balance_sessions(clan_id,game_id,host_user_id,series_id,round_number)
    values(v_room.clan_id,v_room.game_id,v_host,v_room.id,1) returning id into v_round;
  perform private.queue_next_balance_room(v_room.schedule_id);
  return jsonb_build_object('ok',true,'room_id',v_room.id,'series_id',v_room.id,'round_id',v_round);
end $$;

create function private.create_balance_room(p_clan_id uuid,p_kind text,p_title text,p_scheduled_at timestamptz default null,
  p_rsvp_days integer default null,p_repeat_every_days integer default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_role public.clan_member_role; v_game uuid; v_room uuid; v_schedule uuid; v_at timestamptz := coalesce(p_scheduled_at,clock_timestamp());
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  select role into v_role from public.clan_members where clan_id = p_clan_id and user_id = auth.uid() and status = 'active' for share;
  if v_role is null or (p_kind = 'regular' and v_role not in ('leader','officer')) then
    raise exception '내전 방을 만들 권한이 없습니다.' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('regular','flash') or p_title is null or char_length(btrim(p_title)) not between 1 and 80 or
    not isfinite(v_at) or (p_rsvp_days is not null and (p_kind <> 'flash' or p_rsvp_days not between 1 and 30)) or
    (p_repeat_every_days is not null and (p_kind <> 'regular' or p_repeat_every_days not between 1 and 365)) then
    raise exception '방 이름과 예약 설정을 확인하세요.';
  end if;
  -- Also serialize against legacy open RPCs, whose contract remains one open.
  select game_id into v_game from public.clans where id = p_clan_id for update;
  if not found then raise exception '클랜을 찾을 수 없습니다.'; end if;
  if p_repeat_every_days is not null then
    insert into public.balance_room_schedules(clan_id,title,created_by,interval_days,next_run_at)
      values(p_clan_id,btrim(p_title),auth.uid(),p_repeat_every_days,v_at + make_interval(days => p_repeat_every_days)) returning id into v_schedule;
  end if;
  insert into public.balance_rooms(clan_id,game_id,kind,title,created_by,scheduled_at,rsvp_days,schedule_id)
    values(p_clan_id,v_game,p_kind,btrim(p_title),auth.uid(),v_at,p_rsvp_days,v_schedule) returning id into v_room;
  if v_at <= clock_timestamp() then return private.open_balance_room_internal(v_room); end if;
  return jsonb_build_object('ok',true,'room_id',v_room,'series_id',null);
end $$;
create function private.open_balance_room(p_clan_id uuid,p_room_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_balance_room(p_room_id,p_clan_id) then
    raise exception '이 내전 방을 운영할 권한이 없습니다.' using errcode = '42501';
  end if;
  return private.open_balance_room_internal(p_room_id);
end $$;
create function private.update_balance_room(p_clan_id uuid,p_room_id uuid,p_title text,p_scheduled_at timestamptz,p_rsvp_days integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_room public.balance_rooms;
begin
  select * into v_room from public.balance_rooms where id = p_room_id and clan_id = p_clan_id for update;
  if not found or not private.can_manage_balance_room_as(p_room_id,auth.uid()) then
    raise exception '이 내전 방을 수정할 권한이 없습니다.' using errcode = '42501';
  end if;
  if v_room.status <> 'scheduled' then raise exception '예약 중인 방만 수정할 수 있습니다.'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 80 or p_scheduled_at is null or not isfinite(p_scheduled_at) or
    p_scheduled_at <= clock_timestamp() or (p_rsvp_days is not null and (v_room.kind <> 'flash' or p_rsvp_days not between 1 and 30)) then
    raise exception '방 이름과 미래 예약 시각을 확인하세요.';
  end if;
  -- Editing one occurrence does not move the recurrence's original cadence.
  update public.balance_rooms set title = btrim(p_title),scheduled_at = p_scheduled_at,rsvp_days = p_rsvp_days where id = p_room_id;
  return jsonb_build_object('ok',true);
end $$;
create function private.cancel_balance_room(p_clan_id uuid,p_room_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.balance_rooms;
begin
  select * into v_room from public.balance_rooms where id = p_room_id and clan_id = p_clan_id for update;
  if not found or not private.can_manage_balance_room_as(p_room_id,auth.uid()) then
    raise exception '이 내전 방을 취소할 권한이 없습니다.' using errcode = '42501';
  end if;
  if v_room.status = 'cancelled' then return jsonb_build_object('ok',true); end if;
  if v_room.status <> 'scheduled' then raise exception '예약 중인 방만 취소할 수 있습니다.'; end if;
  update public.balance_rooms set status = 'cancelled',closed_at = clock_timestamp(),delegated_to = null where id = p_room_id;
  perform private.queue_next_balance_room(v_room.schedule_id);
  return jsonb_build_object('ok',true);
end $$;
create function private.set_balance_room_rsvp(p_clan_id uuid,p_room_id uuid,p_response text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.balance_rooms;
begin
  if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then
    raise exception '활동 중인 클랜원만 신청할 수 있습니다.' using errcode = '42501';
  end if;
  select * into v_room from public.balance_rooms where id = p_room_id and clan_id = p_clan_id for update;
  if not found or v_room.kind <> 'flash' or v_room.rsvp_days is null or v_room.status <> 'scheduled' or clock_timestamp() >= v_room.scheduled_at then
    raise exception '참여 신청을 받는 깜짝 내전이 아닙니다.';
  end if;
  if clock_timestamp() < v_room.scheduled_at - make_interval(days => v_room.rsvp_days) then raise exception '참여 신청 기간 전입니다.'; end if;
  if p_response is null or p_response not in ('going','maybe','no') then raise exception '참여 응답을 확인하세요.'; end if;
  insert into public.balance_room_rsvps(room_id,user_id,response) values(p_room_id,auth.uid(),p_response)
    on conflict(room_id,user_id) do update set response = excluded.response,updated_at = clock_timestamp();
  return jsonb_build_object('ok',true);
end $$;
create function private.delegate_balance_room(p_clan_id uuid,p_room_id uuid,p_officer_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.balance_rooms;
begin
  if auth.uid() is null or not exists(select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid() and status = 'active' and role = 'leader') then
    raise exception '클랜장만 운영 담당자를 위임할 수 있습니다.' using errcode = '42501';
  end if;
  select * into v_room from public.balance_rooms where id = p_room_id and clan_id = p_clan_id for update;
  if not found or v_room.kind <> 'regular' or v_room.status not in ('scheduled','open') then raise exception '진행 전·진행 중인 정규 내전만 위임할 수 있습니다.'; end if;
  if p_officer_id is not null and not exists(select 1 from public.clan_members where clan_id = p_clan_id and user_id = p_officer_id and role = 'officer' and status = 'active') then
    raise exception '현재 활동 중인 운영진을 선택하세요.';
  end if;
  update public.balance_rooms set delegated_to = p_officer_id where id = p_room_id;
  return jsonb_build_object('ok',true);
end $$;
create function private.set_balance_room_schedule_enabled(p_clan_id uuid,p_schedule_id uuid,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_schedule public.balance_room_schedules;
begin
  if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
    raise exception '운영진만 반복 일정을 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if p_enabled is null then raise exception '반복 여부를 확인하세요.'; end if;
  -- Keep the same room -> schedule locking order as opening and cancellation.
  perform 1 from public.balance_rooms where schedule_id = p_schedule_id and clan_id = p_clan_id and status = 'scheduled' order by id for update;
  select * into v_schedule from public.balance_room_schedules where id = p_schedule_id and clan_id = p_clan_id for update;
  if not found then raise exception '반복 일정을 찾을 수 없습니다.'; end if;
  update public.balance_room_schedules set enabled = p_enabled where id = p_schedule_id;
  if p_enabled then
    perform private.queue_next_balance_room(p_schedule_id);
  end if;
  return jsonb_build_object('ok',true);
end $$;

create function private.materialize_balance_rooms(p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room record; v_result jsonb; v_opened integer := 0; v_cancelled integer := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Batch limit must be 1..100'; end if;
  -- Only one worker, plus row locks shared with manual opening/cancellation.
  if not pg_try_advisory_xact_lock(726041913) then return jsonb_build_object('opened',0,'cancelled',0); end if;
  for v_room in select r.id from public.balance_rooms r where r.status = 'scheduled' and r.scheduled_at <= clock_timestamp()
    order by r.scheduled_at,r.id limit p_limit for update of r skip locked
  loop
    v_result := private.open_balance_room_internal(v_room.id,true);
    if (v_result->>'ok')::boolean then v_opened := v_opened+1; else v_cancelled := v_cancelled+1; end if;
  end loop;
  return jsonb_build_object('opened',v_opened,'cancelled',v_cancelled);
end $$;

-- Public invoker wrappers are the only new authenticated write API.
create function public.create_balance_room(p_clan_id uuid,p_kind text,p_title text,p_scheduled_at timestamptz default null,p_rsvp_days integer default null,p_repeat_every_days integer default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.create_balance_room(p_clan_id,p_kind,p_title,p_scheduled_at,p_rsvp_days,p_repeat_every_days); $$;
create function public.open_balance_room(p_clan_id uuid,p_room_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.open_balance_room(p_clan_id,p_room_id); $$;
create function public.update_balance_room(p_clan_id uuid,p_room_id uuid,p_title text,p_scheduled_at timestamptz,p_rsvp_days integer default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.update_balance_room(p_clan_id,p_room_id,p_title,p_scheduled_at,p_rsvp_days); $$;
create function public.cancel_balance_room(p_clan_id uuid,p_room_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select private.cancel_balance_room(p_clan_id,p_room_id); $$;
create function public.set_balance_room_rsvp(p_clan_id uuid,p_room_id uuid,p_response text)
returns jsonb language sql security invoker set search_path = '' as $$ select private.set_balance_room_rsvp(p_clan_id,p_room_id,p_response); $$;
create function public.delegate_balance_room(p_clan_id uuid,p_room_id uuid,p_officer_id uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.delegate_balance_room(p_clan_id,p_room_id,p_officer_id); $$;
create function public.set_balance_room_schedule_enabled(p_clan_id uuid,p_schedule_id uuid,p_enabled boolean)
returns jsonb language sql security invoker set search_path = '' as $$ select private.set_balance_room_schedule_enabled(p_clan_id,p_schedule_id,p_enabled); $$;
create function public.materialize_balance_rooms(p_limit integer default 50)
returns jsonb language sql security invoker set search_path = '' as $$ select private.materialize_balance_rooms(p_limit); $$;

-- Preserve all existing CAS, phase, roster, settlement, and audit code. Replace
-- only the precise authorization expressions, failing closed if they drift.
do $$
declare v_signature text; v_definition text; v_before text; v_after text; v_row record;
begin
  for v_row in select * from (values
    ('private.next_balance_round(uuid,uuid)','public.is_clan_officer_plus(p_clan_id)','private.can_manage_balance_round(p_round_id,p_clan_id)'),
    ('private.close_balance_session_series(uuid,uuid)','public.is_clan_officer_plus(p_clan_id)','private.can_manage_balance_round(p_round_id,p_clan_id)'),
    ('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[])','public.is_clan_officer_plus(p_clan_id)','private.can_manage_balance_round(p_round_id,p_clan_id)'),
    ('private.set_balance_formation_settings(uuid,integer,jsonb,boolean,boolean)','public.is_clan_officer_plus(v_round.clan_id)','private.can_manage_balance_round_as(p_round_id,auth.uid())'),
    ('public.set_balance_match_outcome(uuid,public.balance_match_outcome)','public.is_clan_officer_plus(v_sess.clan_id)','private.can_manage_balance_round_as(p_session_id,v_uid)'),
    ('public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text)','v_role not in (''leader'',''officer'')','not private.can_manage_balance_round_as(p_round_id,p_actor_id)')
  ) as patches(signature,before_text,after_text)
  loop
    v_signature := v_row.signature; v_before := v_row.before_text; v_after := v_row.after_text;
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    if position(v_before in v_definition) = 0 then raise exception 'Authorization patch drift: %',v_signature; end if;
    execute replace(v_definition,v_before,v_after);
  end loop;
end $$;
drop policy balance_sessions_update_officer on public.balance_sessions;
create policy balance_sessions_update_room_manager on public.balance_sessions for update to authenticated
using (closed_at is null and private.can_manage_balance_round(id,clan_id))
with check (closed_at is null and private.can_manage_balance_round(id,clan_id));

-- Explicit allowlist: _as helpers, scheduler, triggers and internal opening are
-- never executable by ordinary clients, including authenticated users.
do $$
declare v_name text; v_signature text; v_namespace text;
begin
  foreach v_signature in array array[
    'can_manage_balance_round(uuid,uuid)','can_manage_balance_room(uuid,uuid)',
    'create_balance_room(uuid,text,text,timestamp with time zone,integer,integer)',
    'open_balance_room(uuid,uuid)','update_balance_room(uuid,uuid,text,timestamp with time zone,integer)',
    'cancel_balance_room(uuid,uuid)','set_balance_room_rsvp(uuid,uuid,text)','delegate_balance_room(uuid,uuid,uuid)',
    'set_balance_room_schedule_enabled(uuid,uuid,boolean)'
  ] loop
    foreach v_namespace in array array['private','public'] loop
      execute 'revoke all on function ' || v_namespace || '.' || v_signature || ' from public,anon,authenticated';
      execute 'grant execute on function ' || v_namespace || '.' || v_signature || ' to authenticated,service_role';
    end loop;
  end loop;
  foreach v_signature in array array[
    'private.can_manage_balance_room_as(uuid,uuid)','private.can_manage_balance_round_as(uuid,uuid)',
    'private.sync_balance_room_series()','private.queue_next_balance_room(uuid)',
    'private.open_balance_room_internal(uuid,boolean)','private.materialize_balance_rooms(integer)','public.materialize_balance_rooms(integer)'
  ] loop
    execute 'revoke all on function ' || v_signature || ' from public,anon,authenticated';
    execute 'grant execute on function ' || v_signature || ' to service_role';
  end loop;
end $$;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('balance-room-materializer','* * * * *','select private.materialize_balance_rooms(50);');
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.balance_rooms,public.balance_room_schedules,public.balance_room_rsvps;
  end if;
end $$;
