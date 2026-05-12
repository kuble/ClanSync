-- M5 후속 — D-MANAGE-03 / D-PERM-01: 자기신고 부계정 + view_alt_accounts RLS 정합

-- ---------------------------------------------------------------------------
-- effective_view_alt_account_roles: permissions 부재·빈 배열 시 TS 와 동일 기본값
-- ---------------------------------------------------------------------------
create or replace function public.effective_view_alt_account_roles(p_clan_id uuid)
returns text[]
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  perms jsonb;
  vals text[];
begin
  select cs.permissions into perms
    from clan_settings cs
   where cs.clan_id = p_clan_id;

  if perms is null then
    return array['leader', 'officer', 'member']::text[];
  end if;

  if jsonb_typeof(perms -> 'view_alt_accounts') <> 'array' then
    return array['leader', 'officer', 'member']::text[];
  end if;

  select coalesce(
           array_agg(trim(r.v)) filter (where length(trim(r.v)) > 0),
           array[]::text[]
         )
    into vals
    from jsonb_array_elements_text(perms -> 'view_alt_accounts') as r(v);

  vals := coalesce(vals, array[]::text[]);

  if cardinality(vals) < 1 then
    return array['leader', 'officer', 'member']::text[];
  end if;

  return vals;
end;
$$;

comment on function public.effective_view_alt_account_roles(uuid) is
  'D-PERM-01: permissions.view_alt_accounts 허용 역할 목록(hasClanPermission 과 동형).';

grant execute on function public.effective_view_alt_account_roles(uuid) to authenticated;

-- ---------------------------------------------------------------------------
create table public.user_alt_accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  game_id    uuid not null references public.games (id) on delete restrict,
  alt_nick   varchar(32) not null
    constraint user_alt_accounts_alt_nick_nonempty check (
      trim(alt_nick) <> ''
    ),
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, game_id, alt_nick)
);

comment on table public.user_alt_accounts is
  'D-MANAGE-03: 자기신고 부계동. INSERT 는 주계정이 해당 게임 인증 완료 시만.';

create index user_alt_accounts_user_game_idx on public.user_alt_accounts (user_id, game_id);

alter table public.user_alt_accounts enable row level security;

-- 본인: 전체 접근 (INSERT 는 WITH CHECK 에서 인증 검증)
create policy user_alt_accounts_select_owner on public.user_alt_accounts
  for select using (auth.uid() = user_id);

create policy user_alt_accounts_insert_own_verified_game on public.user_alt_accounts
  for insert with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
        from public.user_game_profiles ugp
       where ugp.user_id = user_alt_accounts.user_id
         and ugp.game_id = user_alt_accounts.game_id
         and ugp.is_verified = true
    )
  );

create policy user_alt_accounts_update_own on public.user_alt_accounts
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
        from public.user_game_profiles ugp
       where ugp.user_id = user_alt_accounts.user_id
         and ugp.game_id = user_alt_accounts.game_id
         and ugp.is_verified = true
    )
  );

create policy user_alt_accounts_delete_own on public.user_alt_accounts
  for delete using (auth.uid() = user_id);

-- 같은 클랜 + view_alt_accounts 역할 허용 시 타인 행 조회
create policy user_alt_accounts_select_clan_peer on public.user_alt_accounts
  for select using (
    auth.uid() is not null
    and auth.uid() <> user_id
    and exists (
      select 1
        from clan_members cm_o
        join clan_members cm_v
          on cm_o.clan_id = cm_v.clan_id
         and cm_o.user_id = user_alt_accounts.user_id
         and cm_v.user_id = auth.uid()
         and cm_o.status = 'active'
         and cm_v.status = 'active'
       where cm_v.role::text = any (public.effective_view_alt_account_roles(cm_v.clan_id))
    )
  );

grant select, insert, update, delete on table public.user_alt_accounts to authenticated;
grant all on table public.user_alt_accounts to service_role;
