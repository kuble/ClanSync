-- M6a — D-STATS-03 활동일 + HoF 집계용 최소 경기 테이블 + clan_settings HoF 컬럼
--
-- 참고: docs/01-plan/schema.md (clan_daily_member_activity, matches 계열)
-- CSV(D-STATS-04) UI는 후속; 권한 키 export_csv 만 문서/앱과 정합.

-- -----------------------------------------------------------------------------
-- D-STATS-03: 활동일 (person-day, KST 자정 경계)
-- -----------------------------------------------------------------------------

create table public.clan_daily_member_activity (
  clan_id        uuid not null references public.clans (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  activity_date  date not null,
  recorded_at    timestamptz not null default now(),
  primary key (clan_id, user_id, activity_date)
);

create index clan_daily_activity_clan_date_idx
  on public.clan_daily_member_activity (clan_id, activity_date desc);

comment on table public.clan_daily_member_activity is
  'D-STATS-03 — 멤버별 클랜 페이지 첫 방문일 1행. KST 일자.';

alter table public.clan_daily_member_activity enable row level security;

create policy clan_daily_activity_select_member on public.clan_daily_member_activity
  for select using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = clan_daily_member_activity.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

-- 직접 INSERT/UPDATE/DELETE 금지 — RPC 만 허용
create policy clan_daily_activity_no_insert on public.clan_daily_member_activity
  for insert with check (false);

create policy clan_daily_activity_no_update on public.clan_daily_member_activity
  for update using (false);

create policy clan_daily_activity_no_delete on public.clan_daily_member_activity
  for delete using (false);

create or replace function public.record_clan_activity(p_clan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date;
begin
  if v_uid is null then
    return;
  end if;

  v_day := (timezone('Asia/Seoul', now()))::date;

  if not exists (
    select 1
      from public.clan_members cm
     where cm.clan_id = p_clan_id
       and cm.user_id = v_uid
       and cm.status = 'active'
  ) then
    return;
  end if;

  insert into public.clan_daily_member_activity (clan_id, user_id, activity_date)
  values (p_clan_id, v_uid, v_day)
  on conflict (clan_id, user_id, activity_date) do nothing;
end;
$$;

comment on function public.record_clan_activity(uuid) is
  '활동일 1건 기록(멱등). 활성 멤버만.';

grant execute on function public.record_clan_activity(uuid) to authenticated;

-- 같은 클랜 활성 멤버의 닉네임만 (users 행 전체 SELECT RLS 회피·최소 공개)
create or replace function public.clan_peer_nicknames(p_clan_id uuid)
returns table (user_id uuid, nickname varchar)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.nickname
    from public.users u
    join public.clan_members cm
      on cm.user_id = u.id
     and cm.clan_id = p_clan_id
     and cm.status = 'active'
   where exists (
     select 1
       from public.clan_members me
      where me.clan_id = p_clan_id
        and me.user_id = auth.uid()
        and me.status = 'active'
   );
$$;

comment on function public.clan_peer_nicknames(uuid) is
  '통계·HoF 표시용. 호출자가 해당 클랜 활성 멤버일 때만 동료 id·nickname 반환.';

grant execute on function public.clan_peer_nicknames(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- clan_settings: HoF (D-STATS-01 / D-ECON-03)
-- -----------------------------------------------------------------------------

alter table public.clan_settings
  add column if not exists expose_hof boolean not null default false,
  add column if not exists hof_config jsonb not null default '{}'::jsonb;

comment on column public.clan_settings.expose_hof is
  'D-ECON-03 — HoF 외부 공개. 클랜장만 변경(앱 가드).';

comment on column public.clan_settings.hof_config is
  'HoF 공개 범위·등재 기준(set_hof_rules 보유자가 액션으로 갱신).';

-- -----------------------------------------------------------------------------
-- 경기 최소 스키마 (내전 집계·HoF 승률)
-- -----------------------------------------------------------------------------

create type public.clan_match_type as enum ('intra', 'scrim', 'event');

create type public.clan_match_status as enum ('draft', 'active', 'finished');

create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  clan_id     uuid not null references public.clans (id) on delete cascade,
  game_id     uuid not null references public.games (id) on delete restrict,
  match_type  public.clan_match_type not null default 'intra',
  played_at   timestamptz not null default now(),
  map_label   varchar(64),
  status      public.clan_match_status not null default 'finished',
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index matches_clan_played_idx on public.matches (clan_id, played_at desc);
create index matches_clan_type_idx on public.matches (clan_id, match_type);

comment on table public.matches is
  '클랜 경기(내전·스크림·이벤트). M6a 최소 컬럼 — BalanceMaker·맵 FK는 후속.';

alter table public.matches enable row level security;

create policy matches_select_clan_member on public.matches
  for select using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = matches.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create table public.match_players (
  id        uuid primary key default gen_random_uuid(),
  match_id  uuid not null references public.matches (id) on delete cascade,
  user_id   uuid not null references public.users (id) on delete cascade,
  team      smallint not null check (team in (1, 2)),
  unique (match_id, user_id)
);

create index match_players_match_idx on public.match_players (match_id);
create index match_players_user_idx on public.match_players (user_id);

comment on table public.match_players is '경기 로스터(팀 1·2).';

alter table public.match_players enable row level security;

create policy match_players_select_clan_member on public.match_players
  for select using (
    exists (
      select 1
        from public.matches m
        join public.clan_members cm on cm.clan_id = m.clan_id
       where m.id = match_players.match_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create table public.match_results (
  match_id     uuid primary key references public.matches (id) on delete cascade,
  winner_team  smallint check (winner_team is null or winner_team in (1, 2)),
  recorded_at  timestamptz not null default now()
);

comment on table public.match_results is '경기 결과(승자 팀). 무승부는 NULL.';

alter table public.match_results enable row level security;

create policy match_results_select_clan_member on public.match_results
  for select using (
    exists (
      select 1
        from public.matches m
        join public.clan_members cm on cm.clan_id = m.clan_id
       where m.id = match_results.match_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );
