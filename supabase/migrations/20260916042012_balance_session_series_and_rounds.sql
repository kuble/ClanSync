-- A session is one day's gathering; the existing balance_sessions rows remain
-- individual rounds so predictions, votes and payouts retain their references.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.balance_session_series (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  host_user_id uuid not null references public.users(id) on delete restrict,
  opened_at timestamptz not null default now(),
  session_date date generated always as ((opened_at at time zone 'Asia/Seoul')::date) stored,
  closed_at timestamptz,
  constraint balance_session_series_time_ck check (closed_at is null or closed_at >= opened_at),
  unique (id, clan_id, game_id)
);
create unique index balance_session_series_one_open_per_clan_idx
  on public.balance_session_series(clan_id) where closed_at is null;
create index balance_session_series_clan_opened_idx
  on public.balance_session_series(clan_id, opened_at desc);
alter table public.balance_session_series enable row level security;
create policy balance_session_series_select_member
  on public.balance_session_series for select to authenticated
  using (public.is_active_clan_member(clan_id));
revoke all on public.balance_session_series from public, anon, authenticated;
grant select on public.balance_session_series to authenticated;
grant all on public.balance_session_series to service_role;

alter table public.balance_sessions
  add column series_id uuid,
  add column round_number integer not null default 1 check (round_number >= 1),
  add column formation_state jsonb,
  add column formation_revision integer not null default 0 check (formation_revision >= 0);

-- Legacy rows have no shared-session evidence, so each keeps its own date and
-- becomes round 1 of a separate session, rather than guessing historical groups.
insert into public.balance_session_series (id, clan_id, game_id, host_user_id, opened_at, closed_at)
select id, clan_id, game_id, host_user_id, opened_at, closed_at
from public.balance_sessions;
update public.balance_sessions set series_id = id;
alter table public.balance_sessions
  alter column series_id set not null,
  add constraint balance_sessions_series_fk
    foreign key (series_id, clan_id, game_id)
    references public.balance_session_series(id, clan_id, game_id) on delete cascade,
  add constraint balance_sessions_series_round_key unique (series_id, round_number);
comment on table public.balance_session_series is
  '내전 세션: 운영진 개설부터 종료까지. session_date는 개설 시점의 한국 날짜이며 자정을 넘어도 고정된다.';
comment on table public.balance_sessions is
  '내전 라운드(경기 한 판). series_id가 당일 세션, round_number가 세션 내 회차. 기존 투표·예측 참조를 유지한다.';

-- Session identity and result settlement must go through atomic operations.
-- Existing phase/roster actions retain their officer RLS and column access.
revoke insert, update, delete on public.balance_sessions from anon, authenticated;
grant update (phase, map_ban_enabled, hero_ban_enabled, map_candidates,
  map_ban_deadline_at, resolved_map_label, roster, ma_snapshot,
  hero_ban_deadline_at, banned_heroes, prediction_deadline_at)
  on public.balance_sessions to authenticated;
drop policy balance_sessions_update_officer on public.balance_sessions;
create policy balance_sessions_update_officer on public.balance_sessions
  for update to authenticated
  using (closed_at is null and public.is_clan_officer_plus(clan_id))
  with check (closed_at is null and public.is_clan_officer_plus(clan_id));

create function private.open_balance_session_series(
  p_clan_id uuid, p_map_ban boolean, p_hero_ban boolean
)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_game uuid;
  v_series uuid;
  v_round uuid;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '42501'; end if;
  if not public.is_clan_officer_plus(p_clan_id) then
    raise exception '운영진만 세션을 열 수 있습니다.' using errcode = '42501';
  end if;
  -- Serialize open attempts even when no session row exists yet.
  select game_id into v_game from public.clans where id = p_clan_id for update;
  if not found then raise exception '클랜을 찾을 수 없습니다.'; end if;
  if exists (select 1 from public.balance_session_series where clan_id = p_clan_id and closed_at is null) then
    raise exception '이미 열린 세션이 있습니다.' using errcode = '23505';
  end if;
  insert into public.balance_session_series(clan_id, game_id, host_user_id)
    values (p_clan_id, v_game, v_uid) returning id into v_series;
  insert into public.balance_sessions(clan_id, game_id, host_user_id, series_id, round_number,
    map_ban_enabled, hero_ban_enabled)
    values (p_clan_id, v_game, v_uid, v_series, 1,
      coalesce(p_map_ban, false), coalesce(p_hero_ban, false)) returning id into v_round;
  return jsonb_build_object('ok', true, 'series_id', v_series, 'round_id', v_round);
end;
$$;

create function private.next_balance_round(p_clan_id uuid, p_round_id uuid)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_old public.balance_sessions%rowtype;
  v_parent public.balance_session_series%rowtype;
  v_round uuid;
begin
  if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
    raise exception '운영진만 다음 라운드를 열 수 있습니다.' using errcode = '42501';
  end if;
  -- All lifecycle operations lock the round first, matching result settlement.
  select * into v_old from public.balance_sessions
    where id = p_round_id and clan_id = p_clan_id for update;
  if not found then raise exception '라운드를 찾을 수 없습니다.'; end if;
  select * into v_parent from public.balance_session_series where id = v_old.series_id for update;
  if v_parent.closed_at is not null then raise exception '종료된 세션입니다.'; end if;
  if v_old.closed_at is not null then raise exception '이미 다음 라운드로 이동했습니다.'; end if;
  if v_old.match_outcome = 'pending' then raise exception '현재 라운드 결과를 먼저 기록하세요.'; end if;
  update public.balance_sessions set closed_at = now() where id = v_old.id;
  insert into public.balance_sessions(clan_id, game_id, host_user_id, series_id, round_number,
    map_ban_enabled, hero_ban_enabled, roster, ma_snapshot)
  values (v_old.clan_id, v_old.game_id, auth.uid(), v_old.series_id, v_old.round_number + 1,
    v_old.map_ban_enabled, v_old.hero_ban_enabled, v_old.roster, v_old.ma_snapshot)
  returning id into v_round;
  return jsonb_build_object('ok', true, 'series_id', v_old.series_id, 'round_id', v_round);
end;
$$;

create function private.close_balance_session_series(p_clan_id uuid, p_round_id uuid)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_round public.balance_sessions%rowtype;
  v_parent public.balance_session_series%rowtype;
begin
  if auth.uid() is null or not public.is_clan_officer_plus(p_clan_id) then
    raise exception '운영진만 세션을 종료할 수 있습니다.' using errcode = '42501';
  end if;
  select * into v_round from public.balance_sessions
    where id = p_round_id and clan_id = p_clan_id for update;
  if not found then raise exception '라운드를 찾을 수 없습니다.'; end if;
  select * into v_parent from public.balance_session_series where id = v_round.series_id for update;
  if v_parent.closed_at is not null then return jsonb_build_object('ok', true); end if;
  if v_round.closed_at is not null then raise exception '현재 라운드에서 세션을 종료하세요.'; end if;
  if v_round.match_outcome = 'pending' and v_round.phase <> 'editing' then
    raise exception '진행 중인 라운드의 결과 또는 무효를 먼저 기록하세요.';
  end if;
  update public.balance_sessions set closed_at = now(),
    match_outcome = case when match_outcome = 'pending' then 'void'::public.balance_match_outcome else match_outcome end,
    prediction_deadline_at = null
    where id = v_round.id;
  update public.balance_session_series set closed_at = now() where id = v_round.series_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- Public wrappers preserve caller identity; privileged writes live outside the
-- exposed schema and independently authorize the current user on every call.
create function public.open_balance_session_series(p_clan_id uuid, p_map_ban boolean default false, p_hero_ban boolean default false)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.open_balance_session_series(p_clan_id, p_map_ban, p_hero_ban); $$;
create function public.next_balance_round(p_clan_id uuid, p_round_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.next_balance_round(p_clan_id, p_round_id); $$;
create function public.close_balance_session_series(p_clan_id uuid, p_round_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.close_balance_session_series(p_clan_id, p_round_id); $$;

revoke all on function private.open_balance_session_series(uuid, boolean, boolean) from public, anon;
revoke all on function private.next_balance_round(uuid, uuid) from public, anon;
revoke all on function private.close_balance_session_series(uuid, uuid) from public, anon;
revoke all on function public.open_balance_session_series(uuid, boolean, boolean) from public, anon;
revoke all on function public.next_balance_round(uuid, uuid) from public, anon;
revoke all on function public.close_balance_session_series(uuid, uuid) from public, anon;
grant execute on function private.open_balance_session_series(uuid, boolean, boolean),
  private.next_balance_round(uuid, uuid), private.close_balance_session_series(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.open_balance_session_series(uuid, boolean, boolean),
  public.next_balance_round(uuid, uuid), public.close_balance_session_series(uuid, uuid)
  to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.balance_session_series;
  end if;
end;
$$;
