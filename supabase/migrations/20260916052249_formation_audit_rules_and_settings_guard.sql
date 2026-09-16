create or replace function public.commit_balance_formation(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_state jsonb,p_roster jsonb,p_actor_id uuid,p_command text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_role public.clan_member_role; v_id uuid; v_round public.balance_sessions; v_event jsonb := '[]'::jsonb;
begin
  select role into v_role from public.clan_members where clan_id = p_clan_id and user_id = p_actor_id and status = 'active' for share;
  if v_role is null then raise exception '활동 중인 클랜원만 참여할 수 있습니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then return false; end if;
  if v_role not in ('leader','officer') and (p_command not in ('pick','bid') or not coalesce(v_round.formation_state->'captains' @> to_jsonb(array[p_actor_id::text]),false)) then
    raise exception '현재 조작 권한이 없습니다.' using errcode = '42501';
  end if;
  if p_command = 'start' and v_round.formation_state is not null then return false; end if;
  if p_command = 'reset' and v_round.formation_state is null then return false; end if;
  if p_command in ('start','reset') then
    v_event := jsonb_build_array(jsonb_build_object('event',p_command,'at',now(),'actorId',p_actor_id,
      'draw',case when p_command = 'start' then p_state->'draw' else v_round.formation_state->'draw' end,
      'order',case when p_command = 'start' then p_state->'order' else null end,
      'players',case when p_command = 'start' then p_state->'players' else null end,
      'mode',case when p_command = 'start' then p_state->>'mode' else null end,
      'settings',case when p_command = 'start' then jsonb_build_object(
        'roles',p_state#>'{settings,roles}','teams',p_state#>'{settings,teams}',
        'auctionBudget',p_state#>'{settings,auctionBudget}','minBid',p_state#>'{settings,minBid}',
        'durationSeconds',p_state#>'{settings,durationSeconds}','captains',p_state#>'{settings,captains}') else null end));
  end if;
  update public.balance_sessions set formation_state = p_state,roster = p_roster,formation_revision = formation_revision + 1,
    draw_history = draw_history || v_event
  where id = p_round_id and formation_revision = p_revision and closed_at is null and phase = 'editing'
    and exists(select 1 from public.balance_session_series s where s.id = series_id and s.closed_at is null)
  returning id into v_id;
  return v_id is not null;
end $$;

create function private.guard_balance_settings() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.formation_settings is distinct from old.formation_settings or
    new.map_ban_enabled is distinct from old.map_ban_enabled or
    new.hero_ban_enabled is distinct from old.hero_ban_enabled then
    if old.phase <> 'editing' or old.formation_state is not null or old.closed_at is not null then
      raise exception '편성 시작 전 설정만 변경할 수 있습니다.';
    end if;
    if new.formation_revision = old.formation_revision then
      new.formation_revision := old.formation_revision + 1;
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_settings() from public,anon,authenticated;
create trigger guard_balance_settings before update on public.balance_sessions
for each row execute function private.guard_balance_settings();


