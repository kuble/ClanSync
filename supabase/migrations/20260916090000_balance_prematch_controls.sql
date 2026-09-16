-- Prematch settings remain editable after formation. Completed historical rounds
-- are preserved; new transitions into match_live must have a selected map.
alter table public.balance_sessions
  add column map_ban_seconds integer not null default 15 check (map_ban_seconds between 5 and 300),
  add column hero_ban_seconds integer not null default 20 check (hero_ban_seconds between 5 and 300),
  add column map_types text[] not null default '{}'::text[]
    check (map_types <@ array['control','push','escort','hybrid']::text[] and array_position(map_types,null) is null);
comment on column public.balance_sessions.map_types is '맵 후보 전장 유형. 빈 배열은 전체 유형.';
comment on column public.balance_sessions.hero_ban_deadline_at is '영웅 밴 투표 마감. 마감 후 신규 투표·변경을 받지 않는다.';
comment on column public.balance_sessions.banned_heroes is 'null: 미확정, 빈 배열: 밴 없이 확정, 그 외: 확정된 영웅 밴.';

create or replace function private.guard_balance_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_map_changed boolean; v_hero_changed boolean; v_map_selected boolean;
begin
  v_map_changed := new.map_ban_enabled is distinct from old.map_ban_enabled or
    new.map_ban_seconds is distinct from old.map_ban_seconds or new.map_types is distinct from old.map_types;
  v_hero_changed := new.hero_ban_enabled is distinct from old.hero_ban_enabled or
    new.hero_ban_seconds is distinct from old.hero_ban_seconds;
  v_map_selected := not new.map_ban_enabled and new.resolved_map_label is distinct from old.resolved_map_label;
  if new.formation_settings is distinct from old.formation_settings then
    if old.phase <> 'editing' or old.formation_state is not null or old.closed_at is not null then
      raise exception '편성 규칙은 편성 시작 전에만 변경할 수 있습니다.';
    end if;
  end if;
  if v_map_changed or v_hero_changed or v_map_selected then
    if old.phase = 'match_live' or old.closed_at is not null or old.match_outcome <> 'pending' then
      raise exception '경기 시작 전 밴 설정만 변경할 수 있습니다.';
    end if;
    -- A changed timer/rule cancels a running ballot atomically with deleting its
    -- votes. Hero-only changes retain a map that was already selected.
    if v_map_changed or (old.phase = 'map_ban' and old.resolved_map_label is null) then
      delete from public.balance_session_map_votes where session_id = old.id;
      new.map_candidates := null;
      new.map_ban_deadline_at := null;
      new.resolved_map_label := null;
    end if;
    delete from public.balance_session_hero_votes where session_id = old.id;
    new.banned_heroes := null;
    new.hero_ban_deadline_at := null;
    new.prediction_deadline_at := null;
    new.phase := 'editing';
  end if;
  if new.formation_settings is distinct from old.formation_settings or v_map_changed or v_hero_changed or v_map_selected then
    if new.formation_revision = old.formation_revision then
      new.formation_revision := old.formation_revision + 1;
    end if;
  end if;
  return new;
end $$;
-- Settings cleanup runs first so the formation guard validates its final phase.
drop trigger guard_balance_settings on public.balance_sessions;
create trigger guard_balance_00_settings before update on public.balance_sessions
for each row execute function private.guard_balance_settings();

create or replace function private.guard_balance_formation() returns trigger
language plpgsql set search_path = '' as $$
declare ids text[]; v_bans_changed boolean;
begin
  v_bans_changed := new.map_ban_enabled is distinct from old.map_ban_enabled or
    new.hero_ban_enabled is distinct from old.hero_ban_enabled or
    new.map_ban_seconds is distinct from old.map_ban_seconds or
    new.hero_ban_seconds is distinct from old.hero_ban_seconds or new.map_types is distinct from old.map_types;
  if new.phase is distinct from old.phase then
    if old.closed_at is not null or old.match_outcome <> 'pending' or not (
      (old.phase = 'editing' and new.phase in ('map_ban','hero_ban','match_live')) or
      (old.phase = 'map_ban' and new.phase in ('hero_ban','match_live')) or
      (old.phase = 'hero_ban' and new.phase = 'match_live') or
      (old.phase in ('map_ban','hero_ban') and new.phase = 'editing' and (v_bans_changed or
        (not new.map_ban_enabled and new.resolved_map_label is distinct from old.resolved_map_label)))
    ) then raise exception '라운드를 이전 단계로 되돌릴 수 없습니다.'; end if;
  end if;
  if old.phase = 'editing' and new.phase <> 'editing' then
    if old.formation_state is not null and old.formation_state->>'stage' <> 'complete' then
      raise exception '팀 편성을 먼저 완료하세요.';
    end if;
    ids := array[new.roster#>>'{team1,tank}',new.roster#>>'{team1,dmg,0}',new.roster#>>'{team1,dmg,1}',new.roster#>>'{team1,sup,0}',new.roster#>>'{team1,sup,1}',
      new.roster#>>'{team2,tank}',new.roster#>>'{team2,dmg,0}',new.roster#>>'{team2,dmg,1}',new.roster#>>'{team2,sup,0}',new.roster#>>'{team2,sup,1}'];
    if (select count(distinct v) from unnest(ids) v where v is not null) <> 10 then
      raise exception '서로 다른 출전자 10명을 먼저 저장하세요.';
    end if;
    if (select count(*) from public.clan_members where clan_id = new.clan_id and status = 'active' and user_id = any(ids::uuid[])) <> 10 then
      raise exception '현재 활동 중인 클랜원만 출전할 수 있습니다.';
    end if;
  end if;
  if new.phase = 'map_ban' and old.phase <> 'map_ban' then
    if not new.map_ban_enabled or cardinality(new.map_candidates) is distinct from 3 or
      (select count(distinct m) from unnest(new.map_candidates) m where nullif(btrim(m),'') is not null) <> 3 then
      raise exception '맵 밴 후보 3개를 먼저 선택하세요.';
    end if;
    new.resolved_map_label := null;
    new.map_ban_deadline_at := clock_timestamp() + make_interval(secs => new.map_ban_seconds);
  end if;
  if new.phase = 'hero_ban' and old.phase <> 'hero_ban' then
    if not new.hero_ban_enabled or nullif(btrim(new.resolved_map_label),'') is null or
      (new.map_ban_enabled and new.map_ban_deadline_at is not null) then
      raise exception '맵을 먼저 확정하세요.';
    end if;
    new.banned_heroes := null;
    new.hero_ban_deadline_at := clock_timestamp() + make_interval(secs => new.hero_ban_seconds);
  end if;
  if new.phase = 'map_ban' and new.resolved_map_label is distinct from old.resolved_map_label and new.resolved_map_label is not null then
    if old.map_ban_deadline_at is null or old.map_ban_deadline_at > clock_timestamp() or
      not (new.resolved_map_label = any(old.map_candidates)) or new.map_ban_deadline_at is not null then
      raise exception '맵 투표 마감 후 후보 맵을 확정하세요.';
    end if;
  end if;
  if new.phase = 'match_live' and old.phase <> 'match_live' then
    if nullif(btrim(new.resolved_map_label),'') is null or new.map_ban_deadline_at is not null then
      raise exception '경기를 시작하기 전에 맵을 확정하세요.';
    end if;
    if new.hero_ban_enabled and (new.banned_heroes is null or new.hero_ban_deadline_at is not null) then
      raise exception '영웅 밴을 먼저 완료하세요.';
    end if;
  end if;
  if new.roster is distinct from old.roster then
    if old.phase <> 'editing' or old.closed_at is not null or old.match_outcome <> 'pending' then
      raise exception '출전 명단은 편성 단계에서만 변경할 수 있습니다.';
    end if;
    if new.formation_revision = old.formation_revision then
      if old.formation_state is not null and old.formation_state->>'stage' <> 'complete' then
        raise exception '진행 중인 팀 편성을 초기화한 뒤 명단을 변경하세요.';
      end if;
      new.formation_state := null;
      new.formation_revision := old.formation_revision + 1;
    end if;
  end if;
  return new;
end $$;

create function private.set_balance_prematch_settings(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean,
  p_map_ban_seconds integer,p_hero_ban_seconds integer,p_map_types text[]
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_round public.balance_sessions; v_min integer; v_budget integer; v_seconds integer; v_types text[];
begin
  if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
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
  if p_map_ban is null or p_hero_ban is null or p_map_ban_seconds is null or p_map_ban_seconds not between 5 and 300 or
    p_hero_ban_seconds is null or p_hero_ban_seconds not between 5 and 300 or p_map_types is null or
    not (p_map_types <@ array['control','push','escort','hybrid']::text[]) or array_position(p_map_types,null) is not null then
    raise exception '밴 제한 시간과 전장 유형을 확인하세요.';
  end if;
  select coalesce(array_agg(distinct v order by v),'{}'::text[]) into v_types from unnest(p_map_types) v;
  update public.balance_sessions set formation_settings = p_settings,map_ban_enabled = p_map_ban,hero_ban_enabled = p_hero_ban,
    map_ban_seconds = p_map_ban_seconds,hero_ban_seconds = p_hero_ban_seconds,map_types = v_types,
    formation_revision = formation_revision + 1 where id = p_round_id;
  return true;
end $$;
create function public.set_balance_prematch_settings(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean,
  p_map_ban_seconds integer,p_hero_ban_seconds integer,p_map_types text[]
) returns boolean language sql security invoker set search_path = '' as $$
  select private.set_balance_prematch_settings(p_round_id,p_clan_id,p_revision,p_settings,p_map_ban,p_hero_ban,p_map_ban_seconds,p_hero_ban_seconds,p_map_types);
$$;
revoke all on function private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[]),
  public.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[]) from public,anon;
grant execute on function private.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[]),
  public.set_balance_prematch_settings(uuid,uuid,integer,jsonb,boolean,boolean,integer,integer,text[]) to authenticated;

create or replace function private.copy_balance_formation_settings() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.round_number > 1 then
    select formation_settings - 'captains',map_ban_seconds,hero_ban_seconds,map_types
      into new.formation_settings,new.map_ban_seconds,new.hero_ban_seconds,new.map_types
      from public.balance_sessions where series_id = new.series_id and round_number = new.round_number - 1;
  end if;
  return new;
end $$;

-- Serialize vote writes with round resets. RLS still enforces self-write and
-- active membership; this trigger also enforces server time and hero lineup.
create function private.guard_balance_ban_vote() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_round public.balance_sessions;
begin
  if tg_op = 'UPDATE' and (new.session_id is distinct from old.session_id or new.user_id is distinct from old.user_id) then
    raise exception '투표 대상을 변경할 수 없습니다.';
  end if;
  select * into v_round from public.balance_sessions where id = new.session_id for update;
  if not found or v_round.closed_at is not null or v_round.match_outcome <> 'pending' then
    raise exception '종료된 라운드에는 투표할 수 없습니다.';
  end if;
  if tg_table_name = 'balance_session_map_votes' then
    if v_round.phase <> 'map_ban' or not v_round.map_ban_enabled or v_round.resolved_map_label is not null or
      v_round.map_ban_deadline_at is null or v_round.map_ban_deadline_at <= clock_timestamp() then
      raise exception '맵 투표가 마감되었습니다.';
    end if;
  else
    if v_round.phase <> 'hero_ban' or not v_round.hero_ban_enabled or v_round.banned_heroes is not null or
      v_round.hero_ban_deadline_at is null or v_round.hero_ban_deadline_at <= clock_timestamp() then
      raise exception '영웅 밴 투표가 마감되었습니다.';
    end if;
    if not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',new.user_id::text)) then
      raise exception '출전 라인업에 포함된 멤버만 투표할 수 있습니다.';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_balance_ban_vote() from public,anon,authenticated;
create trigger guard_balance_map_vote before insert or update on public.balance_session_map_votes
for each row execute function private.guard_balance_ban_vote();
create trigger guard_balance_hero_vote before insert or update on public.balance_session_hero_votes
for each row execute function private.guard_balance_ban_vote();
