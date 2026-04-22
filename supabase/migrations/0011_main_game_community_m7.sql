-- M7 S07 — MainGame 경량 커뮤니티 (D-RANK-01 홍보, D-LFG-01 LFG MVP)
-- 자동 마감 트리거·cron 만료는 서버 액션에서 처리 (MVP).

-- -----------------------------------------------------------------------------
-- board_posts (홍보·스크림 신청 공용 타입; M7 UI는 promotion 위주)
-- -----------------------------------------------------------------------------

create type public.board_post_type as enum ('promotion', 'scrim');

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  clan_id uuid not null references public.clans (id) on delete cascade,
  post_type public.board_post_type not null default 'promotion',
  title varchar(200) not null,
  content text not null default '',
  is_pinned boolean not null default false,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index board_posts_game_promo_idx
  on public.board_posts (game_id, created_at desc)
  where post_type = 'promotion';

create index board_posts_clan_idx on public.board_posts (clan_id);

comment on table public.board_posts is 'MainGame 홍보·스크림 글 (D-RANK-01 정렬: newest / space).';

alter table public.board_posts enable row level security;

create policy board_posts_select_auth on public.board_posts
  for select using ((select auth.uid()) is not null);

create policy board_posts_insert_member on public.board_posts
  for insert with check (
    created_by = (select auth.uid())
    and exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = board_posts.clan_id
         and cm.user_id = (select auth.uid())
         and cm.status = 'active'
    )
    and game_id = (select c.game_id from public.clans c where c.id = clan_id)
  );

-- -----------------------------------------------------------------------------
-- lfg_posts · lfg_applications (D-LFG-01)
-- -----------------------------------------------------------------------------

create type public.lfg_post_status as enum ('open', 'filled', 'expired', 'canceled');

create type public.lfg_application_status as enum (
  'applied',
  'accepted',
  'rejected',
  'canceled',
  'expired'
);

create table public.lfg_posts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  creator_user_id uuid not null references public.users (id) on delete cascade,
  mode varchar(64) not null,
  format varchar(32) not null,
  slots smallint not null check (slots between 1 and 11),
  tiers text[] not null default '{}',
  positions text[] not null default '{}',
  mic_required boolean not null default false,
  start_time_hour smallint not null check (start_time_hour between 0 and 23),
  expires_at timestamptz not null,
  description text,
  status public.lfg_post_status not null default 'open',
  created_at timestamptz not null default now()
);

create index lfg_posts_game_open_idx
  on public.lfg_posts (game_id, expires_at asc)
  where status = 'open';

create index lfg_posts_creator_idx on public.lfg_posts (creator_user_id, created_at desc);

comment on table public.lfg_posts is 'D-LFG-01 LFG 모집 글.';

alter table public.lfg_posts enable row level security;

create policy lfg_posts_select_auth on public.lfg_posts
  for select using ((select auth.uid()) is not null);

create policy lfg_posts_insert_verified on public.lfg_posts
  for insert with check (
    creator_user_id = (select auth.uid())
    and exists (
      select 1
        from public.user_game_profiles ugp
       where ugp.user_id = (select auth.uid())
         and ugp.game_id = lfg_posts.game_id
         and ugp.is_verified = true
    )
  );

create policy lfg_posts_update_creator on public.lfg_posts
  for update using (creator_user_id = (select auth.uid()))
  with check (creator_user_id = (select auth.uid()));

create table public.lfg_applications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.lfg_posts (id) on delete cascade,
  applicant_user_id uuid not null references public.users (id) on delete cascade,
  status public.lfg_application_status not null default 'applied',
  tier varchar(64),
  role varchar(64),
  mic_available boolean,
  message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users (id) on delete set null,
  constraint lfg_app_message_len check (length(coalesce(message, '')) <= 200),
  constraint lfg_app_resolved_check check (
    status = 'applied' or resolved_at is not null
  )
);

create unique index lfg_app_one_active_per_user
  on public.lfg_applications (post_id, applicant_user_id)
  where status = 'applied';

create index lfg_app_post_status_idx on public.lfg_applications (post_id, status);

create index lfg_app_applicant_idx
  on public.lfg_applications (applicant_user_id, status, created_at desc);

comment on table public.lfg_applications is 'D-LFG-01 LFG 신청.';

alter table public.lfg_applications enable row level security;

create policy lfg_app_select on public.lfg_applications
  for select using (
    applicant_user_id = (select auth.uid())
    or exists (
      select 1
        from public.lfg_posts p
       where p.id = lfg_applications.post_id
         and p.creator_user_id = (select auth.uid())
    )
  );

create policy lfg_app_insert_self on public.lfg_applications
  for insert with check (
    applicant_user_id = (select auth.uid())
    and exists (
      select 1
        from public.lfg_posts p
       where p.id = lfg_applications.post_id
         and p.game_id in (
           select ugp.game_id
             from public.user_game_profiles ugp
            where ugp.user_id = (select auth.uid())
              and ugp.is_verified = true
         )
    )
  );

create policy lfg_app_update_applicant on public.lfg_applications
  for update using (applicant_user_id = (select auth.uid()))
  with check (applicant_user_id = (select auth.uid()));

create policy lfg_app_update_creator on public.lfg_applications
  for update using (
    exists (
      select 1
        from public.lfg_posts p
       where p.id = lfg_applications.post_id
         and p.creator_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
        from public.lfg_posts p
       where p.id = lfg_applications.post_id
         and p.creator_user_id = (select auth.uid())
    )
  );
