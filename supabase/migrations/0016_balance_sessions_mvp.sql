-- M6c — 밸런스 세션 MVP: 편집(플레이스홀더) → 맵 밴(3후보·득표 가중 무작위 확정) → 영웅 밴(플레이스홀더) → 경기 화면
-- 참고: docs/01-plan/pages/09-BalanceMaker.md

create type public.balance_session_phase as enum (
  'editing',
  'map_ban',
  'hero_ban',
  'match_live'
);

create table public.balance_sessions (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  host_user_id uuid not null references public.users (id) on delete restrict,
  phase public.balance_session_phase not null default 'editing',
  map_ban_enabled boolean not null default true,
  hero_ban_enabled boolean not null default false,
  map_candidates text[],
  map_ban_deadline_at timestamptz,
  resolved_map_label text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint balance_sessions_map_candidates_len_ck check (
    map_candidates is null
    or cardinality(map_candidates) = 3
  )
);

create unique index balance_sessions_one_open_per_clan_idx
  on public.balance_sessions (clan_id)
  where closed_at is null;

create index balance_sessions_clan_opened_idx
  on public.balance_sessions (clan_id, opened_at desc);

comment on table public.balance_sessions is
  '밸런스메이커 세션(M6c MVP). 클랜당 미종료 세션 1개.';

alter table public.balance_sessions enable row level security;

create policy balance_sessions_select_member on public.balance_sessions
  for select using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = balance_sessions.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create policy balance_sessions_insert_officer on public.balance_sessions
  for insert with check (
    auth.uid() = host_user_id
    and exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = balance_sessions.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
         and cm.role in ('leader', 'officer')
    )
  );

create policy balance_sessions_update_officer on public.balance_sessions
  for update using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = balance_sessions.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
         and cm.role in ('leader', 'officer')
    )
  )
  with check (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = balance_sessions.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
         and cm.role in ('leader', 'officer')
    )
  );

create table public.balance_session_map_votes (
  session_id uuid not null references public.balance_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  choice_idx smallint not null check (choice_idx between 0 and 2),
  primary key (session_id, user_id)
);

create index balance_session_map_votes_session_idx
  on public.balance_session_map_votes (session_id);

comment on table public.balance_session_map_votes is
  '맵 밴 후보 3개 중 1표(choice_idx 0..2).';

alter table public.balance_session_map_votes enable row level security;

create policy balance_map_votes_select_member on public.balance_session_map_votes
  for select using (
    exists (
      select 1
        from public.balance_sessions bs
        join public.clan_members cm on cm.clan_id = bs.clan_id
       where bs.id = balance_session_map_votes.session_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create policy balance_map_votes_insert_self on public.balance_session_map_votes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
        from public.balance_sessions bs
        join public.clan_members cm on cm.clan_id = bs.clan_id
       where bs.id = session_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create policy balance_map_votes_update_self on public.balance_session_map_votes
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
        from public.balance_sessions bs
        join public.clan_members cm on cm.clan_id = bs.clan_id
       where bs.id = session_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );
