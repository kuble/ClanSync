-- Phase 2 M1 — 인프라 베이스라인 마이그레이션
--
-- 범위: `users` · `user_game_profiles` · `games` · `clans` · `clan_members`
--       5테이블 + 기본 RLS + 인덱스.
--
-- 다음 마이그레이션(0002+)에서 `clan_join_requests`, `clan_settings`,
-- `clan_reports`, `user_nameplate_*`, `user_badge_*`, `matches`, `coin_*`,
-- `notifications*`, `web_push_subscriptions`, `user_privacy_overrides` 등
-- docs/01-plan/schema.md 의 나머지 테이블을 슬라이스별로 확장한다.
--
-- 참고 문서:
--   - docs/01-plan/schema.md
--   - docs/01-plan/decisions.md (D-AUTH-03·D-AUTH-07·D-CLAN-04·D-CLAN-06·D-CLAN-07
--     ·D-STORE-01·D-PERM-01 관련 기본 컬럼만 본 마이그레이션에 선반영)
--
-- RLS 정책은 **가장 좁게** 시작한다. Phase 2 각 슬라이스 완료 시점에
-- 후속 마이그레이션에서 정책을 덧붙이거나 확장한다.

-- =============================================================================
-- 0) 전제 확장 · 공통 타입
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Supabase `auth.users` 와 동일한 스키마 가정. 로컬 CLI 에서도 기본 제공.

-- =============================================================================
-- 1) users  (Supabase Auth 연동 · D-AUTH-03/07, D-STORE-01 coin_balance 포함)
-- =============================================================================

create type user_language as enum ('ko', 'en', 'ja');
create type user_gender   as enum ('male', 'female', 'undisclosed');

create table public.users (
  id                          uuid primary key references auth.users (id) on delete cascade,
  nickname                    varchar(20)  not null,
  email                       citext       not null,
  language                    user_language not null default 'ko',
  birth_year                  int          not null,
  gender                      user_gender  not null default 'undisclosed',
  auto_login                  boolean      not null default false,
  password_updated_at         timestamptz,
  minor_guardian_consent_at   timestamptz,
  discord_user_id             varchar(32),
  discord_linked_at           timestamptz,
  coin_balance                int          not null default 0 check (coin_balance >= 0),
  created_at                  timestamptz  not null default now(),
  updated_at                  timestamptz  not null default now()
);

create unique index users_nickname_key         on public.users (nickname);
create unique index users_email_key            on public.users (email);
create unique index users_discord_user_id_key  on public.users (discord_user_id) where discord_user_id is not null;

comment on table public.users is
  'ClanSync 사용자 프로파일. auth.users 와 1:1. D-AUTH-03/07, D-STORE-01.';

alter table public.users enable row level security;

-- 본인만 SELECT/UPDATE. INSERT/DELETE 는 서비스 롤(가입 트리거)만.
create policy users_self_select on public.users
  for select using (id = auth.uid());

create policy users_self_update on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- =============================================================================
-- 2) games  (서비스 게임 카탈로그 · D-AUTH-02)
-- =============================================================================

create table public.games (
  id             uuid primary key default gen_random_uuid(),
  slug           varchar not null,
  name_ko        varchar not null,
  name_en        varchar,
  name_ja        varchar,
  is_active      boolean not null default true,
  thumbnail_url  varchar,
  created_at     timestamptz not null default now()
);

create unique index games_slug_key on public.games (slug);

comment on table public.games is 'ClanSync 지원 게임 카탈로그. 사용자 노출 순서는 Phase 2+ 에서 정렬 컬럼 추가.';

alter table public.games enable row level security;

-- 게임 카탈로그는 비로그인 포함 모두에게 공개 SELECT.
create policy games_public_select on public.games
  for select using (true);

-- =============================================================================
-- 3) user_game_profiles  (게임 인증)
-- =============================================================================

create table public.user_game_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  game_id       uuid not null references public.games (id) on delete restrict,
  game_uid      varchar not null,
  is_verified   boolean not null default false,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index user_game_profiles_user_game_key
  on public.user_game_profiles (user_id, game_id);

comment on table public.user_game_profiles is
  '사용자의 게임별 인증 레코드. D-AUTH-01 매트릭스 · D-AUTH-02 OAuth.';

alter table public.user_game_profiles enable row level security;

-- 본인 행만 SELECT/INSERT/UPDATE/DELETE. M3 에서 같은 클랜 운영진+ SELECT 확장 예정.
create policy ugp_self_select on public.user_game_profiles
  for select using (user_id = auth.uid());

create policy ugp_self_insert on public.user_game_profiles
  for insert with check (user_id = auth.uid());

create policy ugp_self_update on public.user_game_profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy ugp_self_delete on public.user_game_profiles
  for delete using (user_id = auth.uid());

-- =============================================================================
-- 4) clans  (D-CLAN-04/06 · lifecycle/moderation 기본 컬럼만. 휴면·제재 로직은
--           D-CLAN-03 후속 마이그레이션에서 enum/generated column 확장.)
-- =============================================================================

create type clan_style           as enum ('social', 'casual', 'tryhard', 'pro');
create type clan_gender_policy   as enum ('all', 'male', 'female');
create type clan_lifecycle       as enum ('active', 'dormant', 'stale', 'deleted');
create type clan_moderation      as enum ('clean', 'reported', 'warned', 'hidden', 'deleted');

create table public.clans (
  id                        uuid primary key default gen_random_uuid(),
  game_id                   uuid not null references public.games (id) on delete restrict,
  name                      varchar(24) not null,
  description               text,
  rules                     text,
  style                     clan_style,
  tier_range                text[] not null default '{}',
  min_birth_year            int,
  tags                      text[] not null default '{}',
  gender_policy             clan_gender_policy not null default 'all',
  max_members               int not null default 30 check (max_members between 2 and 200),
  discord_url               varchar,
  kakao_url                 varchar,
  banner_url                varchar,
  icon_url                  varchar,
  lifecycle_status          clan_lifecycle  not null default 'active',
  moderation_status         clan_moderation not null default 'clean',
  last_activity_at          timestamptz,
  coin_balance              int not null default 0 check (coin_balance >= 0),
  ownership_transferred_at  timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- D-CLAN-06: Free·Premium 동일 200 한도. max_members CHECK 로 이미 표현.
-- is_active 생성 컬럼(노출 가능 여부)는 Phase 2 M3 에서 추가 (lifecycle/moderation
-- 기반 소비자 쿼리를 구체화하면서 SELECT 정책과 함께 도입).

create index clans_game_id_idx  on public.clans (game_id);
create index clans_active_idx   on public.clans (game_id, lifecycle_status, moderation_status);

comment on table public.clans is
  '클랜 엔티티. D-CLAN-03(lifecycle/moderation) · D-CLAN-04(폼 payload) · D-CLAN-06(200 한도).';

alter table public.clans enable row level security;

-- 공개 SELECT (비로그인 포함 클랜 목록·상세 열람 가능).
-- 단, 정책 위반·휴면 클랜 필터링은 서버 쿼리에서 lifecycle_status/moderation_status 로 수행.
create policy clans_public_select on public.clans
  for select using (true);

-- INSERT/UPDATE/DELETE 는 서비스 롤만. 클랜 생성·편집 서버 액션은 M3/M4 에서
-- role='leader' 검증 후 service_role 로 수행.

-- =============================================================================
-- 5) clan_members  (D-CLAN-07 last_activity_at 포함)
-- =============================================================================

create type clan_member_role    as enum ('leader', 'officer', 'member');
create type clan_member_status  as enum ('pending', 'active', 'left', 'banned');

create table public.clan_members (
  id                      uuid primary key default gen_random_uuid(),
  clan_id                 uuid not null references public.clans (id) on delete cascade,
  user_id                 uuid not null references public.users (id) on delete cascade,
  role                    clan_member_role   not null default 'member',
  status                  clan_member_status not null default 'pending',
  joined_at               timestamptz,
  last_participated_at    timestamptz,
  last_activity_at        timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index clan_members_clan_user_key on public.clan_members (clan_id, user_id);
create index        clan_members_clan_activity_idx on public.clan_members (clan_id, last_activity_at desc);
create index        clan_members_user_idx          on public.clan_members (user_id);

comment on table public.clan_members is
  '클랜 멤버십. D-CLAN-02(pending→active 가입 승인 트랜잭션) · D-CLAN-07(휴면 분류).';

alter table public.clan_members enable row level security;

-- SELECT: 본인 소속 확인 + 같은 클랜의 active 멤버 전원.
-- (officer+ 전용 추가 정책은 M3 에서 clan_settings.permissions 연동 시 확장.)
create policy clan_members_self_select on public.clan_members
  for select using (user_id = auth.uid());

create policy clan_members_same_clan_select on public.clan_members
  for select using (
    exists (
      select 1
        from public.clan_members me
       where me.clan_id = clan_members.clan_id
         and me.user_id = auth.uid()
         and me.status  = 'active'
    )
  );

-- INSERT/UPDATE/DELETE 는 서비스 롤만. 가입 승인·권한 변경·탈퇴는
-- Server Action 에서 권한 매트릭스(D-PERM-01) 검증 후 service_role 로 수행.

-- =============================================================================
-- 6) updated_at 자동 갱신 트리거 (공용 유틸)
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_user_game_profiles_updated_at
  before update on public.user_game_profiles
  for each row execute function public.set_updated_at();

create trigger trg_clans_updated_at
  before update on public.clans
  for each row execute function public.set_updated_at();

create trigger trg_clan_members_updated_at
  before update on public.clan_members
  for each row execute function public.set_updated_at();
