create or replace function public.commit_balance_formation(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_state jsonb,p_roster jsonb,p_actor_id uuid,p_command text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_role public.clan_member_role; v_id uuid; v_round public.balance_sessions; v_event jsonb := '[]'::jsonb;
begin
  select role into v_role from public.clan_members where clan_id = p_clan_id and user_id = p_actor_id and status = 'active' for share;
  if v_role is null then raise exception '활동 중인 클랜원만 참여할 수 있습니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then return false; end if;
  if p_command not in ('start','reset','apply','pick','bid','lot','settle','pause','resume','tick','choose-item') then
    raise exception '지원하지 않는 조작입니다.' using errcode = '22023';
  end if;
  if p_command <> 'tick' and not private.can_manage_balance_round_as(p_round_id,p_actor_id) and (p_command not in ('pick','bid','choose-item') or not coalesce(v_round.formation_state->'captains' @> to_jsonb(array[p_actor_id::text]),false)) then
    raise exception '현재 조작 권한이 없습니다.' using errcode = '42501';
  end if;
  if p_command = 'start' and v_round.formation_state is not null then return false; end if;
  if p_command = 'reset' and v_round.formation_state is null then return false; end if;
  -- A captain who also manages the room is still restricted to their own team.
  if p_command in ('pick','bid','choose-item') and
    coalesce(v_round.formation_state->'captains' @> to_jsonb(array[p_actor_id::text]),false) then
    if p_command = 'bid' and p_state#>>'{auction,team}' is distinct from
      (case when v_round.formation_state#>>'{captains,0}' = p_actor_id::text then 'team1' else 'team2' end) then
      raise exception '현재 팀 주장만 조작할 수 있습니다.' using errcode = '42501';
    end if;
    if exists (
      select 1 from (values ('team1',1),('team2',0)) as opponents(team,captain_index)
      where v_round.formation_state->'captains'->>captain_index = p_actor_id::text and (
        p_state->'roster'->team is distinct from v_round.formation_state->'roster'->team or
        p_state->'budgets'->team is distinct from v_round.formation_state->'budgets'->team or
        p_state->'itemChoices'->team is distinct from v_round.formation_state->'itemChoices'->team
      )
    ) then raise exception '상대 팀의 선택은 변경할 수 없습니다.' using errcode = '42501'; end if;
  end if;
  if p_command = 'tick' and p_state is not distinct from v_round.formation_state then return true; end if;
  if p_command in ('start','reset') then
    v_event := jsonb_build_array(jsonb_build_object('event',p_command,'at',now(),'actorId',p_actor_id,
      'draw',case when p_command = 'start' then p_state->'draw' else v_round.formation_state->'draw' end,
      'order',case when p_command = 'start' then p_state->'order' else null end,
      'players',case when p_command = 'start' then p_state->'players' else null end,
      'mode',case when p_command = 'start' then p_state->>'mode' else null end,
      'settings',case when p_command = 'start' then jsonb_build_object(
        'roles',p_state#>'{settings,roles}','teams',p_state#>'{settings,teams}',
        'auctionBudget',p_state#>'{settings,auctionBudget}','minBid',p_state#>'{settings,minBid}',
        'durationSeconds',p_state#>'{settings,durationSeconds}','auctionItemsEnabled',p_state#>'{settings,auctionItemsEnabled}','strategySeconds',p_state#>'{settings,strategySeconds}','captains',p_state#>'{settings,captains}') else null end));
  end if;
  update public.balance_sessions set formation_state = p_state,roster = p_roster,formation_revision = formation_revision + 1,
    draw_history = draw_history || v_event
  where id = p_round_id and formation_revision = p_revision and closed_at is null and phase = 'editing'
    and exists(select 1 from public.balance_session_series s where s.id = series_id and s.closed_at is null)
  returning id into v_id;
  return v_id is not null;
end $$;

revoke all on function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.commit_balance_formation(uuid,uuid,integer,jsonb,jsonb,uuid,text) to service_role;

-- Compare actual rules with defaults so a pre-existing round may still change
-- presentation without treating the newly introduced default keys as new rules.
create function private.balance_formation_rules(p_settings jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select ('{"auctionItemsEnabled":false,"strategySeconds":30}'::jsonb || coalesce(p_settings,'{}'::jsonb))
    - array['showPlayerCardScore','showPlayerCardInfo','showTeamComparisonSummary','showPlayerSessionSummary','playerCardInfo']::text[];
$$;
revoke all on function private.balance_formation_rules(jsonb) from public,anon,authenticated;

do $$
declare v_definition text; v_before text;
begin
  v_definition := pg_get_functiondef('private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer)'::regprocedure);
  v_before := $needle$(p_settings - array['showPlayerCardScore','showPlayerCardInfo','showTeamComparisonSummary','showPlayerSessionSummary','playerCardInfo']::text[])$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Formation rules comparison drift'; end if;
  v_definition := replace(v_definition,v_before,'private.balance_formation_rules(p_settings)');
  v_definition := replace(v_definition,replace(v_before,'p_settings','v_round.formation_settings'),'private.balance_formation_rules(v_round.formation_settings)');
  v_before := $needle$'durationSeconds','showPlayerCardScore'$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Formation allowed fields drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$'durationSeconds','auctionItemsEnabled','strategySeconds','showPlayerCardScore'$replacement$);
  v_before := $needle$v_seconds is null or v_seconds < 10 or v_seconds > 60 or$needle$;
  if position(v_before in v_definition) = 0 then raise exception 'Formation timer validation drift'; end if;
  v_definition := replace(v_definition,v_before,$replacement$
    v_seconds is null or v_seconds < 10 or v_seconds > 60 or
    (p_settings ? 'auctionItemsEnabled' and jsonb_typeof(p_settings->'auctionItemsEnabled') is distinct from 'boolean') or
    (p_settings ? 'strategySeconds' and (jsonb_typeof(p_settings->'strategySeconds') is distinct from 'number' or
      (p_settings->>'strategySeconds')::numeric <> trunc((p_settings->>'strategySeconds')::numeric) or
      (p_settings->>'strategySeconds')::numeric not between 10 and 120)) or
  $replacement$);
  execute v_definition;

  v_definition := pg_get_functiondef('private.guard_balance_settings()'::regprocedure);
  v_before := 'if new.formation_settings is distinct from old.formation_settings then';
  if position(v_before in v_definition) = 0 then raise exception 'Formation guard drift'; end if;
  v_definition := replace(v_definition,v_before,'if private.balance_formation_rules(new.formation_settings) is distinct from private.balance_formation_rules(old.formation_settings) then');
  execute v_definition;
end $$;


