-- M3 S02 — D-CLAN-02 가입 신청 테이블 + RLS 1차

create type clan_join_request_status as enum (
  'pending',
  'approved',
  'rejected',
  'canceled'
);

create table public.clan_join_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  status clan_join_request_status not null default 'pending',
  applied_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users (id) on delete set null,
  message text not null default '',
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_clan_join_requests_active_per_user_game
  on public.clan_join_requests (user_id, game_id)
  where (status = 'pending');

create index clan_join_requests_clan_pending_idx
  on public.clan_join_requests (clan_id)
  where (status = 'pending');

create index clan_join_requests_user_game_idx
  on public.clan_join_requests (user_id, game_id);

comment on table public.clan_join_requests is
  'D-CLAN-02 가입 신청. 게임당 단일 pending 은 부분 유니크 인덱스로 강제.';

alter table public.clan_join_requests enable row level security;

create policy cjr_select_own on public.clan_join_requests
  for select using (user_id = auth.uid());

create policy cjr_select_staff on public.clan_join_requests
  for select using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = clan_join_requests.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
         and cm.role in ('leader', 'officer')
    )
  );

create policy cjr_insert_own on public.clan_join_requests
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and game_id = (select c.game_id from public.clans c where c.id = clan_id)
  );

create policy cjr_update_own_cancel on public.clan_join_requests
  for update
  using (user_id = auth.uid() and status = 'pending')
  with check (
    user_id = auth.uid()
    and status = 'canceled'
    and resolved_by = auth.uid()
  );

create trigger trg_clan_join_requests_updated_at
  before update on public.clan_join_requests
  for each row execute function public.set_updated_at();
