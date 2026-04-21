-- Phase 2 M2 — 로그인 잠금(D-AUTH-06) · 게임 카탈로그 시드 · auth.users → public.users

-- =============================================================================
-- 1) 감사 로그 + 잠금 카운터 (서비스 롤 전용 사용 가정)
-- =============================================================================

create type auth_failed_login_reason as enum (
  'invalid_password',
  'unknown_email',
  'locked',
  'oauth_denied'
);

create table public.auth_failed_logins (
  id           uuid primary key default gen_random_uuid(),
  email        citext not null,
  ip           inet not null,
  user_agent   text,
  reason       auth_failed_login_reason not null,
  attempted_at timestamptz not null default now()
);

create index auth_failed_logins_email_ip_time_idx
  on public.auth_failed_logins (email, ip, attempted_at desc);
create index auth_failed_logins_attempted_at_idx
  on public.auth_failed_logins (attempted_at);

comment on table public.auth_failed_logins is 'D-AUTH-06 로그인 실패 감사. 90일 보존 정책은 별도 작업(Cron)으로 정리.';

alter table public.auth_failed_logins enable row level security;

create table public.auth_login_lockouts (
  email                 citext not null,
  ip                    inet not null,
  consecutive_failures  int not null default 0,
  locked_until          timestamptz,
  updated_at            timestamptz not null default now(),
  primary key (email, ip)
);

comment on table public.auth_login_lockouts is 'D-AUTH-06: (email,ip)별 연속 실패·잠금 만료.';

alter table public.auth_login_lockouts enable row level security;

-- =============================================================================
-- 2) 게임 카탈로그 시드 (D-AUTH-02 · games.html 매칭)
-- =============================================================================

insert into public.games (slug, name_ko, name_en, is_active)
values
  ('overwatch', '오버워치', 'Overwatch', true),
  ('valorant', '발로란트', 'Valorant', true),
  ('lol', '리그 오브 레전드', 'League of Legends', false),
  ('pubg', 'PUBG BATTLEGROUNDS', 'PUBG: BATTLEGROUNDS', false)
on conflict (slug) do update set
  name_ko    = excluded.name_ko,
  name_en    = excluded.name_en,
  is_active  = excluded.is_active;

-- =============================================================================
-- 3) auth.users 생성 시 public.users 동기화 (이메일 가입)
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nick   text;
  byear  int;
  g      user_gender;
begin
  nick := coalesce(new.raw_user_meta_data->>'nickname', split_part(coalesce(new.email, 'user'), '@', 1));
  nick := left(trim(nick), 20);
  if nick = '' then nick := 'user'; end if;

  byear := coalesce((new.raw_user_meta_data->>'birth_year')::int, (extract(year from now())::int - 15));
  if byear < 1950 or byear > extract(year from now())::int then
    byear := extract(year from now())::int - 15;
  end if;

  if coalesce(new.raw_user_meta_data->>'gender', '') in ('male', 'female', 'undisclosed') then
    g := (new.raw_user_meta_data->>'gender')::user_gender;
  else
    g := 'undisclosed'::user_gender;
  end if;

  insert into public.users (id, nickname, email, birth_year, gender, auto_login)
  values (
    new.id,
    nick,
    coalesce(new.email, '')::citext,
    byear,
    g,
    coalesce((new.raw_user_meta_data->>'auto_login')::boolean, false)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
