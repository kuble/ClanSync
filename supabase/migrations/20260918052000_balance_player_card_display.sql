-- Card presentation is saved with each round, but does not alter formation rules.
create or replace function private.set_balance_prematch_settings(
  p_round_id uuid,p_clan_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean,
  p_map_ban_seconds integer,p_hero_ban_seconds integer,p_map_types text[],p_hero_bans_per_team integer default 2
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_round public.balance_sessions;
  v_min integer;
  v_budget integer;
  v_seconds integer;
  v_types text[];
  v_formation_changed boolean;
begin
  if auth.uid() is null or not private.can_manage_balance_round(p_round_id,p_clan_id) then
    raise exception '운영진만 설정할 수 있습니다.' using errcode = '42501';
  end if;
  select * into v_round from public.balance_sessions where id = p_round_id and clan_id = p_clan_id for update;
  if not found then raise exception '라운드를 찾을 수 없습니다.' using errcode = '42501'; end if;
  if p_revision is null or v_round.formation_revision <> p_revision or v_round.phase = 'match_live' or
    v_round.closed_at is not null or v_round.match_outcome <> 'pending' then return false; end if;
  if not exists(select 1 from public.balance_session_series where id = v_round.series_id and closed_at is null) then return false; end if;

  v_formation_changed :=
    (p_settings - array['showPlayerCardScore','showPlayerCardInfo','playerCardInfo']::text[])
    is distinct from
    (v_round.formation_settings - array['showPlayerCardScore','showPlayerCardInfo','playerCardInfo']::text[]);
  if v_formation_changed and (v_round.formation_state is not null or v_round.phase <> 'editing') then
    raise exception '편성 규칙은 편성 시작 전에만 변경할 수 있습니다.';
  end if;

  v_min := (p_settings->>'minBid')::integer;
  v_budget := (p_settings->>'auctionBudget')::integer;
  v_seconds := (p_settings->>'durationSeconds')::integer;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' or
    not coalesce(p_settings->>'roles' in ('manual','lottery'),false) or
    not coalesce(p_settings->>'teams' in ('keep','random','draft','auction'),false) or
    jsonb_typeof(p_settings->'showPlayerCardScore') <> 'boolean' or
    jsonb_typeof(p_settings->'showPlayerCardInfo') <> 'boolean' or
    not coalesce(p_settings->>'playerCardInfo' in ('record','streak'),false) or
    v_min is null or v_min < 10 or v_min > 1000 or v_min % 10 <> 0 or
    v_budget is null or v_budget < v_min*4 or v_budget > 100000 or v_budget % v_min <> 0 or
    v_seconds is null or v_seconds < 10 or v_seconds > 60 or
    (p_settings - array['roles','teams','captains','auctionBudget','minBid','durationSeconds','showPlayerCardScore','showPlayerCardInfo','playerCardInfo']::text[]) <> '{}'::jsonb then
    raise exception '편성 규칙을 확인하세요.';
  end if;
  if v_formation_changed and p_settings ? 'captains' and (
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
