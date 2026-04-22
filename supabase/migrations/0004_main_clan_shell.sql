-- M4 S03 — MainClan 쉘: 클랜 플랜 티어 + clan_settings(D-PERM-01 저장소)

create type clan_subscription_tier as enum ('free', 'premium');

alter table public.clans
  add column subscription_tier clan_subscription_tier not null default 'free';

comment on column public.clans.subscription_tier is
  '클랜 구독 티어. 실결제 연동은 Phase 2+; M4 는 서버 액션·시드로 토글.';

-- ---------------------------------------------------------------------------
-- clan_settings (D-PERM-01 permissions jsonb)
-- ---------------------------------------------------------------------------

create table public.clan_settings (
  clan_id     uuid primary key references public.clans (id) on delete cascade,
  permissions jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id) on delete set null
);

comment on table public.clan_settings is
  '클랜별 권한 매트릭스 저장. 부재 키는 앱 CLAN_PERMISSION_DEFAULTS 적용.';

create index clan_settings_updated_at_idx on public.clan_settings (updated_at desc);

alter table public.clan_settings enable row level security;

create policy clan_settings_select_active_member on public.clan_settings
  for select using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = clan_settings.clan_id
         and cm.user_id = auth.uid()
         and cm.status = 'active'
    )
  );

create policy clan_settings_update_leader on public.clan_settings
  for update using (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = clan_settings.clan_id
         and cm.user_id = auth.uid()
         and cm.role = 'leader'
         and cm.status = 'active'
    )
  )
  with check (
    exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = clan_settings.clan_id
         and cm.user_id = auth.uid()
         and cm.role = 'leader'
         and cm.status = 'active'
    )
  );

create trigger trg_clan_settings_updated_at
  before update on public.clan_settings
  for each row execute function public.set_updated_at();

-- 신규 클랜마다 settings 행 자동 생성
create or replace function public.create_clan_settings_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clan_settings (clan_id) values (new.id)
  on conflict (clan_id) do nothing;
  return new;
end;
$$;

create trigger trg_clans_create_settings
  after insert on public.clans
  for each row execute function public.create_clan_settings_row();

-- 기존 클랜 백필
insert into public.clan_settings (clan_id)
select c.id
  from public.clans c
 where not exists (
   select 1 from public.clan_settings s where s.clan_id = c.id
 );
