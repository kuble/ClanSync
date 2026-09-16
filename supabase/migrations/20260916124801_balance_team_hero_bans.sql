-- Team ballots allow abstention; each team independently nominates at most 1 or 2 heroes.
alter table public.balance_sessions
  add column hero_bans_per_team integer not null default 2 check (hero_bans_per_team in (1,2)),
  add column hero_ban_context jsonb;
alter table public.balance_session_hero_votes
  alter column pick_2 drop not null,
  alter column pick_3 drop not null;
comment on column public.balance_sessions.hero_ban_context is 'Versioned team nominations and hero roles for future map/role/mastery analysis; no model probabilities are fabricated.';
comment on table public.balance_session_hero_votes is '팀별 동등 가중 투표. 새 투표는 설정에 따라 1~2명이며 미선택은 기권. 기존 3순위 기록은 보존.';

-- Changing the new rule is limited to the settings stage and shares its CAS revision.
create function private.guard_team_hero_ban_count() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.hero_bans_per_team is distinct from old.hero_bans_per_team then
    if old.phase <> 'editing' or old.closed_at is not null or old.match_outcome <> 'pending' or
      old.formation_state->>'appliedAt' is not null then
      raise exception '팀별 밴 개수는 편성 적용 전에만 변경할 수 있습니다.';
    end if;
    if new.formation_revision = old.formation_revision then
      new.formation_revision := old.formation_revision + 1;
    end if;
  end if;
  if new.phase = 'editing' then new.hero_ban_context := null; end if;
  return new;
end $$;
create trigger guard_balance_01_hero_count before update on public.balance_sessions
for each row execute function private.guard_team_hero_ban_count();

-- Carry the per-team limit into the next round along with existing settings.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('private.copy_balance_formation_settings()'::regprocedure);
  definition := replace(definition,'hero_ban_seconds,map_types','hero_ban_seconds,map_types,hero_bans_per_team');
  definition := replace(definition,'new.hero_ban_seconds,new.map_types','new.hero_ban_seconds,new.map_types,new.hero_bans_per_team');
  execute definition;
end $$;

drop function public.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[]);
drop function private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[]);
create function private.set_balance_prematch_settings(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean,
  p_map_ban_seconds integer,p_hero_ban_seconds integer,p_map_types text[],p_hero_bans_per_team integer default 2
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_round public.balance_sessions; v_min integer; v_budget integer; v_seconds integer; v_types text[];
begin
  if auth.uid() is null or not private.can_manage_balance_round(p_round_id,p_clan_id) then
    raise exception '운영진만 설정할 수 있습니다.' using errcode = '42501';
  end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then raise exception '라운드를 찾을 수 없습니다.' using errcode = '42501'; end if;
  if p_revision is null or v_round.formation_revision <> p_revision or v_round.phase = 'match_live' or
    v_round.closed_at is not null or v_round.match_outcome <> 'pending' then return false; end if;
  if not exists(select 1 from public.balance_session_series where id = v_round.series_id and closed_at is null) then return false; end if;
  if p_settings is distinct from v_round.formation_settings and (v_round.formation_state is not null or v_round.phase <> 'editing') then
    raise exception '편성 규칙은 편성 시작 전에만 변경할 수 있습니다.';
  end if;
  v_min := (p_settings->>'minBid')::integer; v_budget := (p_settings->>'auctionBudget')::integer; v_seconds := (p_settings->>'durationSeconds')::integer;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' or
    not coalesce(p_settings->>'roles' in ('manual','lottery'),false) or
    not coalesce(p_settings->>'teams' in ('keep','random','draft','auction'),false) or
    v_min is null or v_min < 10 or v_min > 1000 or v_min % 10 <> 0 or
    v_budget is null or v_budget < v_min*4 or v_budget > 100000 or v_budget % v_min <> 0 or
    v_seconds is null or v_seconds < 10 or v_seconds > 60 or
    (p_settings - array['roles','teams','captains','auctionBudget','minBid','durationSeconds']::text[]) <> '{}'::jsonb then
    raise exception '편성 규칙을 확인하세요.';
  end if;
  -- After a draft begins the current roster can be incomplete; unchanged captain
  -- rules were already validated before formation and must remain saveable.
  if p_settings is distinct from v_round.formation_settings and p_settings ? 'captains' and (
    jsonb_typeof(p_settings->'captains') <> 'array' or jsonb_array_length(p_settings->'captains') <> 2 or
    p_settings#>>'{captains,0}' = p_settings#>>'{captains,1}' or
    not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p_settings#>>'{captains,0}')) or
    not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p_settings#>>'{captains,1}'))
  ) then raise exception '출전자 중 주장 두 명을 선택하세요.'; end if;
  if p_hero_bans_per_team is null or p_hero_bans_per_team not in (1,2) or p_map_ban is null or p_hero_ban is null or p_map_ban_seconds is null or p_map_ban_seconds not between 5 and 300 or
    p_hero_ban_seconds is null or p_hero_ban_seconds not between 5 and 300 or p_map_types is null or
    not (p_map_types <@ array['control','push','escort','hybrid']::text[]) or array_position(p_map_types,null) is not null then
    raise exception '밴 제한 시간과 전장 유형을 확인하세요.';
  end if;
  select coalesce(array_agg(distinct v order by v),'{}'::text[]) into v_types from unnest(p_map_types) v;
  update public.balance_sessions set formation_settings = p_settings,map_ban_enabled = p_map_ban,hero_ban_enabled = p_hero_ban,
    map_ban_seconds = p_map_ban_seconds,hero_ban_seconds = p_hero_ban_seconds,map_types = v_types,hero_bans_per_team = p_hero_bans_per_team,
    formation_revision = formation_revision + 1 where id = p_round_id;
  return true;
end $$;
create function public.set_balance_prematch_settings(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean,
  p_map_ban_seconds integer,p_hero_ban_seconds integer,p_map_types text[],p_hero_bans_per_team integer default 2
) returns boolean language sql security invoker set search_path = '' as $$
  select private.set_balance_prematch_settings(p_round_id,p_clan_id,p_revision,p_settings,p_map_ban,p_hero_ban,p_map_ban_seconds,p_hero_ban_seconds,p_map_types,p_hero_bans_per_team);
$$;
revoke all on function private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer),
  public.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer) from public,anon;
grant execute on function private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer),
  public.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[],integer) to authenticated;


-- A browser submits the deadline of the ballot it displayed. Lock the round and
-- compare that identity before writing so a delayed vote cannot cross a reset.
create or replace function private.submit_balance_ban_vote(
  p_round_id uuid,p_clan_id uuid,p_kind text,p_expected_deadline timestamptz,
  p_choice_idx integer,p_picks text[]
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_round public.balance_sessions; v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  perform 1 from public.clan_members where clan_id = p_clan_id and user_id = v_user_id and status = 'active' for share;
  if not found then raise exception '활동 중인 클랜원만 투표할 수 있습니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then raise exception '라운드를 찾을 수 없습니다.' using errcode = '42501'; end if;
  if v_round.closed_at is not null or v_round.match_outcome <> 'pending' or p_expected_deadline is null then
    raise exception '투표가 종료되거나 변경되었습니다. 최신 화면을 확인하세요.';
  end if;
  if p_kind = 'map' then
    if v_round.phase <> 'map_ban' or not v_round.map_ban_enabled or v_round.resolved_map_label is not null or
      v_round.map_ban_deadline_at is distinct from p_expected_deadline or p_expected_deadline <= clock_timestamp() then
      raise exception '맵 투표가 종료되거나 변경되었습니다. 최신 화면을 확인하세요.';
    end if;
    if p_choice_idx is null or p_choice_idx not between 0 and 2 then raise exception '잘못된 맵 선택입니다.'; end if;
    insert into public.balance_session_map_votes(session_id,user_id,choice_idx)
      values(p_round_id,v_user_id,p_choice_idx)
      on conflict(session_id,user_id) do update set choice_idx = excluded.choice_idx;
  elsif p_kind = 'hero' then
    if v_round.phase <> 'hero_ban' or not v_round.hero_ban_enabled or v_round.banned_heroes is not null or
      v_round.hero_ban_deadline_at is distinct from p_expected_deadline or p_expected_deadline <= clock_timestamp() then
      raise exception '영웅 밴 투표가 종료되거나 변경되었습니다. 최신 화면을 확인하세요.';
    end if;
    if not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',v_user_id::text)) then
      raise exception '출전 라인업에 포함된 멤버만 투표할 수 있습니다.' using errcode = '42501';
    end if;
    if p_picks is null or cardinality(p_picks) > v_round.hero_bans_per_team or
      array_position(p_picks,null) is not null or
      (select count(distinct hero) from unnest(p_picks) hero) <> cardinality(p_picks) or
      not (p_picks <@ array['dva','doomfist','junker_queen','mauga','orisa','ramattra','reinhardt','roadhog','sigma','winston','wrecking_ball','zarya','ashe','bastion','cassidy','echo','genji','hanzo','junkrat','mei','pharah','reaper','sojourn','soldier_76','sombra','symmetra','torbjorn','tracer','venture','widowmaker','freja','ana','baptiste','brigitte','illari','kiriko','lifeweaver','lucio','mercy','moira','zenyatta','juno']::text[]) then
      raise exception '팀별 밴 개수 이내로 서로 다른 영웅을 선택하세요.';
    end if;
    if cardinality(p_picks) = 0 then
      delete from public.balance_session_hero_votes where session_id = p_round_id and user_id = v_user_id;
      return true;
    end if;
    insert into public.balance_session_hero_votes(session_id,user_id,pick_1,pick_2,pick_3)
      values(p_round_id,v_user_id,p_picks[1],p_picks[2],p_picks[3])
      on conflict(session_id,user_id) do update set pick_1 = excluded.pick_1,pick_2 = excluded.pick_2,pick_3 = excluded.pick_3;
  else
    raise exception '잘못된 투표 종류입니다.';
  end if;
  return true;
end $$;

revoke all on function private.guard_team_hero_ban_count() from public,anon,authenticated;
