-- A recurring reservation is edited as one weekly series in the lobby.
-- Keep the visible pending occurrence and the following cadence aligned.
create or replace function private.update_balance_room(
  p_clan_id uuid,
  p_room_id uuid,
  p_title text,
  p_scheduled_at timestamptz,
  p_rsvp_days integer default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.balance_rooms;
begin
  select * into v_room
  from public.balance_rooms
  where id = p_room_id and clan_id = p_clan_id
  for update;

  if not found or not private.can_manage_balance_room_as(p_room_id, auth.uid()) then
    raise exception '이 내전 방을 수정할 권한이 없습니다.' using errcode = '42501';
  end if;
  if v_room.status <> 'scheduled' then
    raise exception '예약 중인 방만 수정할 수 있습니다.';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 80
    or p_scheduled_at is null or not isfinite(p_scheduled_at)
    or p_scheduled_at <= clock_timestamp()
    or (p_rsvp_days is not null and (v_room.kind <> 'flash' or p_rsvp_days not between 1 and 30)) then
    raise exception '방 이름과 미래 예약 시각을 확인하세요.';
  end if;

  update public.balance_rooms
  set title = btrim(p_title), scheduled_at = p_scheduled_at, rsvp_days = p_rsvp_days
  where id = p_room_id;

  if v_room.schedule_id is not null then
    update public.balance_room_schedules
    set title = btrim(p_title),
        next_run_at = p_scheduled_at + make_interval(days => interval_days)
    where id = v_room.schedule_id and clan_id = p_clan_id;
  end if;

  return jsonb_build_object('ok', true);
end $$;
