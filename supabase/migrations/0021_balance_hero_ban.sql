-- M6c — 영웅 밴: 참가자 3순위 투표(7·5·3) → 누적 점수 → 역할당 최대 2 · 전체 최대 4 확정
-- docs/01-plan/pages/09-BalanceMaker.md

alter table public.balance_sessions
  add column hero_ban_deadline_at timestamptz,
  add column banned_heroes text[];

comment on column public.balance_sessions.hero_ban_deadline_at is
  '영웅 밴 투표 제한 시간(표시용). 만료 후에도 운영진 확정 전까지 투표 수정 가능(MVP).';

comment on column public.balance_sessions.banned_heroes is
  '확정된 밴 영웅 id 슬러그 배열(최대 4).';

create table public.balance_session_hero_votes (
  session_id uuid not null references public.balance_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  pick_1 text not null,
  pick_2 text not null,
  pick_3 text not null,
  primary key (session_id, user_id),
  constraint balance_session_hero_votes_distinct_ck check (
    pick_1 <> pick_2
    and pick_1 <> pick_3
    and pick_2 <> pick_3
  )
);

create index balance_session_hero_votes_session_idx
  on public.balance_session_hero_votes (session_id);

comment on table public.balance_session_hero_votes is
  '영웅 밴: 1·2·3순위(각 7·5·3점 가중). 출전 로스터 멤버만 제출(액션에서 검증).';

alter table public.balance_session_hero_votes enable row level security;

create policy balance_hero_votes_select_member on public.balance_session_hero_votes
  for select using (
    exists (
      select 1
        from public.balance_sessions bs
        join public.clan_members cm on cm.clan_id = bs.clan_id
       where bs.id = balance_session_hero_votes.session_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create policy balance_hero_votes_insert_self on public.balance_session_hero_votes
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

create policy balance_hero_votes_update_self on public.balance_session_hero_votes
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
