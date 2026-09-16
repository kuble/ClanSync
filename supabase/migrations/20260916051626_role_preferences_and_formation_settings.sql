-- Preferences stay private. Only the player's effective ranking is resolved by
-- the trusted formation action; shared state contains the result, never rankings.
create function private.valid_role_ranking(p_ranking text[]) returns boolean
language sql immutable set search_path = '' as $$
  select p_ranking is not null and (
    cardinality(p_ranking) = 0 or
    (cardinality(p_ranking) = 3 and p_ranking @> array['tank','dmg','sup']::text[])
  );
$$;
revoke all on function private.valid_role_ranking(text[]) from public,anon;
grant execute on function private.valid_role_ranking(text[]) to authenticated,service_role;

create table public.profile_role_preferences (
  user_id uuid not null references public.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  ranking text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id,game_id),
  check (private.valid_role_ranking(ranking))
);
create table public.balance_round_role_preferences (
  round_id uuid not null references public.balance_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  ranking text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (round_id,user_id),
  check (private.valid_role_ranking(ranking))
);
create index balance_round_role_preferences_user_idx on public.balance_round_role_preferences(user_id);
create index profile_role_preferences_game_idx on public.profile_role_preferences(game_id);
alter table public.profile_role_preferences enable row level security;
alter table public.balance_round_role_preferences enable row level security;
create policy profile_role_preferences_self_read on public.profile_role_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy balance_round_role_preferences_self_read on public.balance_round_role_preferences
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.profile_role_preferences, public.balance_round_role_preferences from public,anon,authenticated;
grant select on public.profile_role_preferences, public.balance_round_role_preferences to authenticated;
grant all on public.profile_role_preferences, public.balance_round_role_preferences to service_role;

alter table public.balance_sessions
  add column formation_settings jsonb not null default '{"roles":"manual","teams":"keep","auctionBudget":1000,"minBid":10,"durationSeconds":20}'::jsonb,
  add column draw_history jsonb not null default '[]'::jsonb;

create function private.save_profile_role_preference(p_game_id uuid, p_ranking text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  if not private.valid_role_ranking(p_ranking) then raise exception '역할 선호를 확인하세요.'; end if;
  if not exists(select 1 from public.user_game_profiles where user_id = v_uid and game_id = p_game_id) then
    raise exception '연결된 게임의 선호만 변경할 수 있습니다.' using errcode = '42501';
  end if;
  -- Lock rounds before writing preferences. Any formation built from an older
  -- preference snapshot loses the revision CAS, including first-time preferences.
  for v_id in select id from public.balance_sessions
    where game_id = p_game_id and phase = 'editing' and closed_at is null and formation_state is null
      and jsonb_path_exists(roster, '$.*.** ? (@ == $id)', jsonb_build_object('id',v_uid::text))
    order by id for update
  loop
    update public.balance_sessions set formation_revision = formation_revision + 1 where id = v_id;
  end loop;
  insert into public.profile_role_preferences(user_id,game_id,ranking)
    values(v_uid,p_game_id,p_ranking)
    on conflict(user_id,game_id) do update set ranking = excluded.ranking, updated_at = now();
end $$;

create function private.save_round_role_preference(p_round_id uuid, p_ranking text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_round public.balance_sessions;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id for update;
  if not found or not public.is_active_clan_member(v_round.clan_id) or
    not jsonb_path_exists(v_round.roster, '$.*.** ? (@ == $id)', jsonb_build_object('id',v_uid::text)) then
    raise exception '이번 라운드 출전자만 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if v_round.closed_at is not null or v_round.phase <> 'editing' or v_round.formation_state is not null or
    not exists(select 1 from public.balance_session_series where id = v_round.series_id and closed_at is null) then
    raise exception '편성이 시작되어 이번 라운드 선호를 변경할 수 없습니다.';
  end if;
  -- NULL deletes an override and follows the profile; [] explicitly has no preference.
  if p_ranking is null then
    delete from public.balance_round_role_preferences where round_id = p_round_id and user_id = v_uid;
  else
    if not private.valid_role_ranking(p_ranking) then raise exception '역할 선호를 확인하세요.'; end if;
    insert into public.balance_round_role_preferences(round_id,user_id,ranking)
      values(p_round_id,v_uid,p_ranking)
      on conflict(round_id,user_id) do update set ranking = excluded.ranking, updated_at = now();
  end if;
  update public.balance_sessions set formation_revision = formation_revision + 1 where id = p_round_id;
end $$;

create function public.save_profile_role_preference(p_game_id uuid,p_ranking text[])
returns void language sql security invoker set search_path = '' as $$ select private.save_profile_role_preference(p_game_id,p_ranking); $$;
create function public.save_round_role_preference(p_round_id uuid,p_ranking text[] default null)
returns void language sql security invoker set search_path = '' as $$ select private.save_round_role_preference(p_round_id,p_ranking); $$;
revoke all on function private.save_profile_role_preference(uuid,text[]),private.save_round_role_preference(uuid,text[]),
  public.save_profile_role_preference(uuid,text[]),public.save_round_role_preference(uuid,text[]) from public,anon;
grant execute on function private.save_profile_role_preference(uuid,text[]),private.save_round_role_preference(uuid,text[]),
  public.save_profile_role_preference(uuid,text[]),public.save_round_role_preference(uuid,text[]) to authenticated;

-- Resolve a snapshot privately; the caller's subsequent commit must still match
-- formation_revision, which every relevant preference and setting update advances.
create function public.resolve_balance_role_preferences(p_round_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(p.id,coalesce(to_jsonb(r.ranking),to_jsonb(d.ranking),'[]'::jsonb)),'{}'::jsonb)
  from public.balance_sessions s
  cross join lateral (select distinct trim(both '"' from v::text)::uuid id
    from jsonb_path_query(s.roster,'$.*.** ? (@.type() == "string")') q(v)) p
  left join public.profile_role_preferences d on d.user_id = p.id and d.game_id = s.game_id
  left join public.balance_round_role_preferences r on r.user_id = p.id and r.round_id = s.id
  where s.id = p_round_id;
$$;
revoke all on function public.resolve_balance_role_preferences(uuid) from public,anon,authenticated;
grant execute on function public.resolve_balance_role_preferences(uuid) to service_role;

create function private.set_balance_formation_settings(p_round_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_round public.balance_sessions; v_min integer; v_budget integer; v_seconds integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  select * into v_round from public.balance_sessions where id = p_round_id for update;
  if not found or not public.is_clan_officer_plus(v_round.clan_id) then raise exception '운영진만 설정할 수 있습니다.' using errcode = '42501'; end if;
  if v_round.formation_revision <> p_revision or v_round.phase <> 'editing' or v_round.closed_at is not null or v_round.formation_state is not null then return false; end if;
  if not exists(select 1 from public.balance_session_series where id = v_round.series_id and closed_at is null) then return false; end if;
  v_min := (p_settings->>'minBid')::integer; v_budget := (p_settings->>'auctionBudget')::integer; v_seconds := (p_settings->>'durationSeconds')::integer;
  if jsonb_typeof(p_settings) <> 'object' or
    not coalesce(p_settings->>'roles' in ('manual','lottery'),false) or
    not coalesce(p_settings->>'teams' in ('keep','random','draft','auction'),false) or
    v_min is null or v_min < 10 or v_min > 1000 or v_min % 10 <> 0 or
    v_budget is null or v_budget < v_min*4 or v_budget > 100000 or v_budget % v_min <> 0 or
    v_seconds is null or v_seconds < 10 or v_seconds > 60 or
    (p_settings - array['roles','teams','captains','auctionBudget','minBid','durationSeconds']::text[]) <> '{}'::jsonb then
    raise exception '편성 규칙을 확인하세요.';
  end if;
  if p_settings ? 'captains' and (
    jsonb_typeof(p_settings->'captains') <> 'array' or jsonb_array_length(p_settings->'captains') <> 2 or
    p_settings#>>'{captains,0}' = p_settings#>>'{captains,1}' or
    not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p_settings#>>'{captains,0}')) or
    not jsonb_path_exists(v_round.roster,'$.*.** ? (@ == $id)',jsonb_build_object('id',p_settings#>>'{captains,1}'))
  ) then raise exception '출전자 중 주장 두 명을 선택하세요.'; end if;
  update public.balance_sessions set formation_settings = p_settings,map_ban_enabled = coalesce(p_map_ban,false),
    hero_ban_enabled = coalesce(p_hero_ban,false),formation_revision = formation_revision + 1 where id = p_round_id;
  return true;
end $$;
create function public.set_balance_formation_settings(p_round_id uuid,p_revision integer,p_settings jsonb,p_map_ban boolean,p_hero_ban boolean)
returns boolean language sql security invoker set search_path = '' as $$ select private.set_balance_formation_settings(p_round_id,p_revision,p_settings,p_map_ban,p_hero_ban); $$;
revoke all on function private.set_balance_formation_settings(uuid,integer,jsonb,boolean,boolean),public.set_balance_formation_settings(uuid,integer,jsonb,boolean,boolean) from public,anon;
grant execute on function private.set_balance_formation_settings(uuid,integer,jsonb,boolean,boolean),public.set_balance_formation_settings(uuid,integer,jsonb,boolean,boolean) to authenticated;

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
      'mode',case when p_command = 'start' then p_state->>'mode' else null end));
  end if;
  update public.balance_sessions set formation_state = p_state,roster = p_roster,formation_revision = formation_revision + 1,
    draw_history = draw_history || v_event
  where id = p_round_id and formation_revision = p_revision and closed_at is null and phase = 'editing'
    and exists(select 1 from public.balance_session_series s where s.id = series_id and s.closed_at is null)
  returning id into v_id;
  return v_id is not null;
end $$;

-- A new round carries the chosen rules; preferences remain per-player defaults
-- unless that player explicitly supplies a new round override.
create function private.copy_balance_formation_settings() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.round_number > 1 then
    select formation_settings - 'captains' into new.formation_settings from public.balance_sessions
      where series_id = new.series_id and round_number = new.round_number - 1;
  end if;
  return new;
end $$;
revoke all on function private.copy_balance_formation_settings() from public,anon,authenticated;
create trigger copy_balance_formation_settings before insert on public.balance_sessions
  for each row execute function private.copy_balance_formation_settings();
