-- M5 S08 — D-PROFILE-01~04 네임플레이트·뱃지 스키마
-- game_id 는 public.games(id) UUID (schema.md 텍스트 코드 대신 카탈로그 FK 정합)

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------

create type public.nameplate_category as enum ('emblem', 'namebar', 'sub', 'frame');

create type public.nameplate_unlock_source as enum (
  'default',
  'event',
  'store',
  'achievement'
);

create type public.badge_strip_category as enum (
  'battle',
  'participation',
  'event',
  'clan',
  'clansync'
);

create type public.badge_unlock_kind as enum ('achievement', 'event', 'store');

-- -----------------------------------------------------------------------------
-- Catalog: nameplate_options
-- -----------------------------------------------------------------------------

create table public.nameplate_options (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  category public.nameplate_category not null,
  code text not null,
  name_ko text not null,
  name_en text,
  icon_class text,
  unlock_source public.nameplate_unlock_source not null default 'default',
  linked_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint nameplate_options_code_key unique (code)
);

create index nameplate_options_game_id_idx on public.nameplate_options (game_id);

comment on table public.nameplate_options is 'D-PROFILE-01 네임플레이트 카탈로그.';

alter table public.nameplate_options enable row level security;

create policy nameplate_options_public_select on public.nameplate_options
  for select using (true);

-- -----------------------------------------------------------------------------
-- user_nameplate_inventory (비 default 옵션 보유)
-- -----------------------------------------------------------------------------

create table public.user_nameplate_inventory (
  user_id uuid not null references public.users (id) on delete cascade,
  option_id uuid not null references public.nameplate_options (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, option_id)
);

comment on table public.user_nameplate_inventory is
  'D-PROFILE-01 보유 옵션. default 출처는 행 없이 기본 보유로 간주.';

alter table public.user_nameplate_inventory enable row level security;

create policy uni_select_self on public.user_nameplate_inventory
  for select using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- user_nameplate_selections
-- -----------------------------------------------------------------------------

create table public.user_nameplate_selections (
  user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  category public.nameplate_category not null,
  option_id uuid not null references public.nameplate_options (id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, category)
);

comment on table public.user_nameplate_selections is
  'D-PROFILE-01 게임×카테고리별 단일 선택.';

alter table public.user_nameplate_selections enable row level security;

create policy uns_select_visible on public.user_nameplate_selections
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1
        from public.clan_members a
        join public.clan_members b
          on a.clan_id = b.clan_id
         and a.status = 'active'
         and b.status = 'active'
       where a.user_id = (select auth.uid())
         and b.user_id = user_nameplate_selections.user_id
    )
  );

create policy uns_insert_self on public.user_nameplate_selections
  for insert with check (user_id = (select auth.uid()));

create policy uns_update_self on public.user_nameplate_selections
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy uns_delete_self on public.user_nameplate_selections
  for delete using (user_id = (select auth.uid()));

create trigger trg_user_nameplate_selections_updated_at
  before update on public.user_nameplate_selections
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- badges catalog
-- -----------------------------------------------------------------------------

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  category public.badge_strip_category not null,
  code text not null,
  name_ko text not null,
  name_en text,
  description text not null,
  icon text not null,
  unlock_source public.badge_unlock_kind not null,
  unlock_condition jsonb not null default '{}'::jsonb,
  linked_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint badges_code_key unique (code),
  constraint badges_store_personal_coin check (
    unlock_source <> 'store'
    or (
      unlock_condition ? 'coin_type'
      and unlock_condition->>'coin_type' = 'personal'
    )
  )
);

create index badges_game_category_idx on public.badges (game_id, category);

comment on table public.badges is 'D-PROFILE-04 뱃지 카탈로그.';

alter table public.badges enable row level security;

create policy badges_public_select on public.badges
  for select using (true);

-- -----------------------------------------------------------------------------
-- user_badge_unlocks
-- -----------------------------------------------------------------------------

create table public.user_badge_unlocks (
  user_id uuid not null references public.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  source_detail jsonb,
  primary key (user_id, badge_id)
);

comment on table public.user_badge_unlocks is 'D-PROFILE-04 해금 이력.';

alter table public.user_badge_unlocks enable row level security;

create policy ubu_select_visible on public.user_badge_unlocks
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1
        from public.clan_members a
        join public.clan_members b
          on a.clan_id = b.clan_id
         and a.status = 'active'
         and b.status = 'active'
       where a.user_id = (select auth.uid())
         and b.user_id = user_badge_unlocks.user_id
    )
  );

-- -----------------------------------------------------------------------------
-- user_badge_picks (compact 0..4)
-- -----------------------------------------------------------------------------

create table public.user_badge_picks (
  user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  slot_index int not null,
  badge_id uuid not null references public.badges (id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, slot_index),
  constraint user_badge_picks_slot_range check (slot_index between 0 and 4)
);

comment on table public.user_badge_picks is 'D-PROFILE-03 스트립 픽 (dense-from-front).';

alter table public.user_badge_picks enable row level security;

create policy ubp_select_visible on public.user_badge_picks
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1
        from public.clan_members a
        join public.clan_members b
          on a.clan_id = b.clan_id
         and a.status = 'active'
         and b.status = 'active'
       where a.user_id = (select auth.uid())
         and b.user_id = user_badge_picks.user_id
    )
  );

create policy ubp_insert_self on public.user_badge_picks
  for insert with check (user_id = (select auth.uid()));

create policy ubp_update_self on public.user_badge_picks
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy ubp_delete_self on public.user_badge_picks
  for delete using (user_id = (select auth.uid()));

create trigger trg_user_badge_picks_updated_at
  before update on public.user_badge_picks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Triggers: selection / pick 검증 (보유·해금)
-- -----------------------------------------------------------------------------

create or replace function public.trg_enforce_nameplate_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  opt record;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'nameplate selection user mismatch';
  end if;

  select
    id,
    game_id,
    category,
    unlock_source
    into opt
    from public.nameplate_options
   where id = new.option_id
     and is_active = true;

  if not found then
    raise exception 'invalid nameplate option';
  end if;

  if opt.game_id is distinct from new.game_id
     or opt.category is distinct from new.category then
    raise exception 'nameplate option mismatch';
  end if;

  if opt.unlock_source = 'default' then
    return new;
  end if;

  if exists (
    select 1
      from public.user_nameplate_inventory i
     where i.user_id = new.user_id
       and i.option_id = new.option_id
  ) then
    return new;
  end if;

  raise exception 'nameplate option not owned';
end;
$$;

create trigger trg_user_nameplate_selections_enforce
  before insert or update on public.user_nameplate_selections
  for each row execute function public.trg_enforce_nameplate_selection();

create or replace function public.trg_enforce_badge_pick()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'badge pick user mismatch';
  end if;

  if new.slot_index < 0 or new.slot_index > 4 then
    raise exception 'badge slot out of range';
  end if;

  select id, game_id, unlock_source, unlock_condition
    into b
    from public.badges
   where id = new.badge_id
     and is_active = true;

  if not found then
    raise exception 'invalid badge';
  end if;

  if b.game_id is distinct from new.game_id then
    raise exception 'badge game mismatch';
  end if;

  if b.unlock_source = 'achievement'
     and coalesce((b.unlock_condition->>'always')::boolean, false) then
    return new;
  end if;

  if exists (
    select 1
      from public.user_badge_unlocks u
     where u.user_id = new.user_id
       and u.badge_id = new.badge_id
  ) then
    return new;
  end if;

  raise exception 'badge not unlocked';
end;
$$;

create trigger trg_user_badge_picks_enforce
  before insert or update on public.user_badge_picks
  for each row execute function public.trg_enforce_badge_pick();

-- -----------------------------------------------------------------------------
-- Seed: nameplate defaults (overwatch, valorant) + starter badges (always)
-- -----------------------------------------------------------------------------

insert into public.nameplate_options (
  game_id, category, code, name_ko, name_en, icon_class, unlock_source
)
select g.id, v.category, v.code, v.name_ko, v.name_en, v.icon_class, 'default'::public.nameplate_unlock_source
  from public.games g
 cross join (values
   ('emblem'::public.nameplate_category, 'ow-emblem-default', '기본 엠블럼', 'Default emblem', 'np-emblem'),
   ('namebar', 'ow-namebar-default', '기본 이름표', 'Default name bar', 'np-namebar'),
   ('sub', 'ow-sub-default', '기본 서브', 'Default sub', 'np-sub'),
   ('frame', 'ow-frame-default', '기본 프레임', 'Default frame', 'np-frame')
 ) as v(category, code, name_ko, name_en, icon_class)
 where g.slug = 'overwatch'
on conflict (code) do nothing;

insert into public.nameplate_options (
  game_id, category, code, name_ko, name_en, icon_class, unlock_source
)
select g.id, v.category, v.code, v.name_ko, v.name_en, v.icon_class, 'default'::public.nameplate_unlock_source
  from public.games g
 cross join (values
   ('emblem'::public.nameplate_category, 'val-emblem-default', '기본 엠블럼', 'Default emblem', 'np-emblem'),
   ('namebar', 'val-namebar-default', '기본 이름표', 'Default name bar', 'np-namebar'),
   ('sub', 'val-sub-default', '기본 서브', 'Default sub', 'np-sub'),
   ('frame', 'val-frame-default', '기본 프레임', 'Default frame', 'np-frame')
 ) as v(category, code, name_ko, name_en, icon_class)
 where g.slug = 'valorant'
on conflict (code) do nothing;

insert into public.badges (
  game_id, category, code, name_ko, name_en, description, icon,
  unlock_source, unlock_condition
)
select g.id,
       'clansync'::public.badge_strip_category,
       'ow-badge-starter',
       '클랜싱크 스타터',
       'ClanSync Starter',
       '프로필에서 뱃지 스트립을 시험해 볼 수 있는 기본 뱃지입니다.',
       'CS',
       'achievement'::public.badge_unlock_kind,
       '{"always": true}'::jsonb
  from public.games g
 where g.slug = 'overwatch'
on conflict (code) do nothing;

insert into public.badges (
  game_id, category, code, name_ko, name_en, description, icon,
  unlock_source, unlock_condition
)
select g.id,
       'clansync'::public.badge_strip_category,
       'val-badge-starter',
       '클랜싱크 스타터',
       'ClanSync Starter',
       '프로필에서 뱃지 스트립을 시험해 볼 수 있는 기본 뱃지입니다.',
       'CS',
       'achievement'::public.badge_unlock_kind,
       '{"always": true}'::jsonb
  from public.games g
 where g.slug = 'valorant'
on conflict (code) do nothing;

insert into public.badges (
  game_id, category, code, name_ko, name_en, description, icon,
  unlock_source, unlock_condition
)
select g.id,
       'battle'::public.badge_strip_category,
       'ow-badge-locked-demo',
       '승리 마스터 (잠금)',
       'Win Master',
       '스크림 승리 10회 달성 시 해금됩니다. (데모)',
       '10',
       'achievement'::public.badge_unlock_kind,
       '{"metric": "scrim_wins", "threshold": 10}'::jsonb
  from public.games g
 where g.slug = 'overwatch'
on conflict (code) do nothing;

insert into public.badges (
  game_id, category, code, name_ko, name_en, description, icon,
  unlock_source, unlock_condition
)
select g.id,
       'battle'::public.badge_strip_category,
       'val-badge-locked-demo',
       '승리 마스터 (잠금)',
       'Win Master',
       '스크림 승리 10회 달성 시 해금됩니다. (데모)',
       '10',
       'achievement'::public.badge_unlock_kind,
       '{"metric": "scrim_wins", "threshold": 10}'::jsonb
  from public.games g
 where g.slug = 'valorant'
on conflict (code) do nothing;
