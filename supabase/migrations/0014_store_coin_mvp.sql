-- M6b — D-STORE-01 MVP: coin_transactions · store_items · purchases + 원자적 구매 RPC

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.coin_pool_type as enum ('clan', 'personal');

create type public.store_item_type as enum ('clan_deco', 'profile_deco');

-- -----------------------------------------------------------------------------
-- coin_transactions (INSERT-only 원장, D-ECON-02)
-- -----------------------------------------------------------------------------

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans (id) on delete restrict,
  user_id uuid references public.users (id) on delete restrict,
  pool_type public.coin_pool_type not null,
  amount int not null check (amount <> 0),
  reason varchar(80) not null,
  reference_type varchar(40) not null,
  reference_id uuid not null,
  sub_key varchar(80) not null default '',
  balance_after int not null check (balance_after >= 0),
  correction_of uuid references public.coin_transactions (id) on delete restrict,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint coin_transactions_pool_user_ck check (
    (pool_type = 'personal' and user_id is not null and clan_id is null)
    or (pool_type = 'clan' and clan_id is not null and user_id is null)
  ),
  constraint coin_transactions_idempotency unique (
    pool_type,
    reference_type,
    reference_id,
    sub_key
  )
);

create index coin_transactions_user_pool_created_idx
  on public.coin_transactions (user_id, pool_type, created_at desc);

create index coin_transactions_clan_pool_created_idx
  on public.coin_transactions (clan_id, pool_type, created_at desc);

create index coin_transactions_reference_idx
  on public.coin_transactions (reference_type, reference_id);

comment on table public.coin_transactions is
  'D-STORE-01 / D-ECON-02 — 코인 원장 INSERT-only. 정정은 correction_of 반대 부호 거래.';

alter table public.coin_transactions enable row level security;

create policy coin_transactions_select_personal on public.coin_transactions
  for select using (
    pool_type = 'personal'
    and user_id = (select auth.uid())
  );

create policy coin_transactions_select_clan_officer on public.coin_transactions
  for select using (
    pool_type = 'clan'
    and exists (
      select 1
        from public.clan_members cm
       where cm.clan_id = coin_transactions.clan_id
         and cm.user_id = (select auth.uid())
         and cm.status = 'active'
         and cm.role in ('leader', 'officer')
    )
  );

-- INSERT/UPDATE/DELETE: 정책 없음 → 인증 사용자는 거부. service_role은 RLS 우회.

-- -----------------------------------------------------------------------------
-- store_items
-- -----------------------------------------------------------------------------

create table public.store_items (
  id uuid primary key default gen_random_uuid(),
  slug varchar(64) not null unique,
  item_type public.store_item_type not null,
  pool_source public.coin_pool_type not null,
  game_id uuid references public.games (id) on delete restrict,
  name_ko varchar(120) not null,
  price_coins int not null check (price_coins > 0),
  asset_url varchar(500),
  is_premium_only boolean not null default false,
  is_active boolean not null default true,
  released_at timestamptz not null default now(),
  constraint store_items_pool_match_ck check (
    (item_type = 'clan_deco' and pool_source = 'clan')
    or (item_type = 'profile_deco' and pool_source = 'personal')
  )
);

comment on table public.store_items is
  'D-STORE-01 — 스토어 카탈로그. clan_deco↔clan 풀, profile_deco↔personal 풀 고정.';

create index store_items_active_idx on public.store_items (is_active) where is_active = true;

alter table public.store_items enable row level security;

create policy store_items_select_auth on public.store_items
  for select using ((select auth.uid()) is not null);

-- 쓰기 정책 없음 (카탈로그는 마이그레이션·서비스 롤만).

-- -----------------------------------------------------------------------------
-- purchases
-- -----------------------------------------------------------------------------

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete restrict,
  clan_id uuid references public.clans (id) on delete restrict,
  item_id uuid not null references public.store_items (id) on delete restrict,
  pool_source public.coin_pool_type not null,
  price_coins int not null check (price_coins > 0),
  coin_transaction_id uuid not null unique references public.coin_transactions (id) on delete restrict,
  approved_by uuid references public.users (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.users (id) on delete set null,
  void_reason text,
  purchased_at timestamptz not null default now(),
  constraint purchases_pool_clan_ck check (
    (pool_source = 'clan' and clan_id is not null)
    or (pool_source = 'personal' and clan_id is null)
  ),
  constraint purchases_void_all_or_none_ck check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (
      voided_at is not null
      and voided_by is not null
      and void_reason is not null
    )
  ),
  constraint purchases_void_not_self_ck check (
    voided_by is null
    or voided_by <> user_id
  )
);

create unique index purchases_one_clan_item_active_idx
  on public.purchases (clan_id, item_id)
  where pool_source = 'clan' and voided_at is null;

create unique index purchases_one_user_personal_item_active_idx
  on public.purchases (user_id, item_id)
  where pool_source = 'personal' and voided_at is null;

comment on table public.purchases is
  'D-STORE-01/02/03 — 스토어 구매 행. 차감은 coin_transactions 와 1:1.';

alter table public.purchases enable row level security;

create policy purchases_select_own_or_clan on public.purchases
  for select using (
    user_id = (select auth.uid())
    or (
      clan_id is not null
      and exists (
        select 1
          from public.clan_members cm
         where cm.clan_id = purchases.clan_id
           and cm.user_id = (select auth.uid())
           and cm.status = 'active'
           and cm.role in ('leader', 'officer')
      )
    )
  );

-- 쓰기: 서비스 롤(RPC)만.

-- -----------------------------------------------------------------------------
-- RPC: 서비스 롤만 EXECUTE (앱에서 권한 검증 후 호출)
-- -----------------------------------------------------------------------------

create or replace function public.apply_store_purchase(
  p_actor_id uuid,
  p_context_clan_id uuid,
  p_item_slug text,
  p_checkout_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.store_items%rowtype;
  v_tier public.clan_subscription_tier;
  v_role public.clan_member_role;
  v_status public.clan_member_status;
  v_new_balance int;
  v_tx_id uuid;
  v_purchase_id uuid;
  v_price int;
begin
  if p_actor_id is null
     or p_context_clan_id is null
     or p_item_slug is null
     or length(trim(p_item_slug)) < 1
     or p_checkout_id is null
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_args');
  end if;

  select * into v_item
    from public.store_items
   where slug = p_item_slug
     and is_active = true
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  select c.subscription_tier
    into v_tier
    from public.clans c
   where c.id = p_context_clan_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'clan_not_found');
  end if;

  select cm.role, cm.status
    into v_role, v_status
    from public.clan_members cm
   where cm.clan_id = p_context_clan_id
     and cm.user_id = p_actor_id;

  if not found or v_status is distinct from 'active'::public.clan_member_status then
    return jsonb_build_object('ok', false, 'error', 'not_clan_member');
  end if;

  if v_item.is_premium_only
     and v_tier is distinct from 'premium'::public.clan_subscription_tier
  then
    return jsonb_build_object('ok', false, 'error', 'premium_required');
  end if;

  v_price := v_item.price_coins;

  if v_item.pool_source = 'personal'::public.coin_pool_type then
    if exists (
      select 1
        from public.purchases p
       where p.user_id = p_actor_id
         and p.item_id = v_item.id
         and p.pool_source = 'personal'::public.coin_pool_type
         and p.voided_at is null
    ) then
      return jsonb_build_object('ok', false, 'error', 'already_purchased');
    end if;

    update public.users u
       set coin_balance = u.coin_balance - v_price
     where u.id = p_actor_id
       and u.coin_balance >= v_price
     returning u.coin_balance into v_new_balance;

    if v_new_balance is null then
      return jsonb_build_object('ok', false, 'error', 'insufficient_coins');
    end if;

    insert into public.coin_transactions (
      clan_id,
      user_id,
      pool_type,
      amount,
      reason,
      reference_type,
      reference_id,
      sub_key,
      balance_after,
      correction_of,
      created_by
    )
    values (
      null,
      p_actor_id,
      'personal'::public.coin_pool_type,
      -v_price,
      'purchase_store',
      'store_checkout',
      p_checkout_id,
      '',
      v_new_balance,
      null,
      p_actor_id
    )
    returning id into v_tx_id;

    insert into public.purchases (
      user_id,
      clan_id,
      item_id,
      pool_source,
      price_coins,
      coin_transaction_id,
      approved_by,
      voided_at,
      voided_by,
      void_reason
    )
    values (
      p_actor_id,
      null,
      v_item.id,
      'personal'::public.coin_pool_type,
      v_price,
      v_tx_id,
      null,
      null,
      null,
      null
    )
    returning id into v_purchase_id;

  elsif v_item.pool_source = 'clan'::public.coin_pool_type then
    if v_role not in (
      'leader'::public.clan_member_role,
      'officer'::public.clan_member_role
    ) then
      return jsonb_build_object('ok', false, 'error', 'officer_required');
    end if;

    if exists (
      select 1
        from public.purchases p
       where p.clan_id = p_context_clan_id
         and p.item_id = v_item.id
         and p.pool_source = 'clan'::public.coin_pool_type
         and p.voided_at is null
    ) then
      return jsonb_build_object('ok', false, 'error', 'already_purchased');
    end if;

    update public.clans c
       set coin_balance = c.coin_balance - v_price
     where c.id = p_context_clan_id
       and c.coin_balance >= v_price
     returning c.coin_balance into v_new_balance;

    if v_new_balance is null then
      return jsonb_build_object('ok', false, 'error', 'insufficient_coins');
    end if;

    insert into public.coin_transactions (
      clan_id,
      user_id,
      pool_type,
      amount,
      reason,
      reference_type,
      reference_id,
      sub_key,
      balance_after,
      correction_of,
      created_by
    )
    values (
      p_context_clan_id,
      null,
      'clan'::public.coin_pool_type,
      -v_price,
      'purchase_store',
      'store_checkout',
      p_checkout_id,
      '',
      v_new_balance,
      null,
      p_actor_id
    )
    returning id into v_tx_id;

    insert into public.purchases (
      user_id,
      clan_id,
      item_id,
      pool_source,
      price_coins,
      coin_transaction_id,
      approved_by,
      voided_at,
      voided_by,
      void_reason
    )
    values (
      p_actor_id,
      p_context_clan_id,
      v_item.id,
      'clan'::public.coin_pool_type,
      v_price,
      v_tx_id,
      null,
      null,
      null,
      null
    )
    returning id into v_purchase_id;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_pool');
  end if;

  return jsonb_build_object(
    'ok',
    true,
    'purchase_id',
    v_purchase_id::text
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate_checkout');
end;
$$;

comment on function public.apply_store_purchase is
  'M6b MVP — 잔액 차감 + coin_transactions + purchases 단일 트랜잭션. EXECUTE는 service_role만.';

revoke all on function public.apply_store_purchase(uuid, uuid, text, uuid) from public;

grant execute on function public.apply_store_purchase(uuid, uuid, text, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Seed (slug로 앱에서 조회)
-- -----------------------------------------------------------------------------

insert into public.store_items (
  slug,
  item_type,
  pool_source,
  game_id,
  name_ko,
  price_coins,
  is_premium_only,
  is_active
)
values
  (
    'clan_banner_slot',
    'clan_deco',
    'clan',
    null,
    '클랜 배너 슬롯',
    100,
    false,
    true
  ),
  (
    'profile_entrance_fx',
    'profile_deco',
    'personal',
    null,
    '프로필 입장 효과',
    500,
    true,
    true
  );

-- -----------------------------------------------------------------------------
-- Grants (기존 마이그레이션과 동일 패턴)
-- -----------------------------------------------------------------------------

grant select on table public.coin_transactions to anon;
grant select on table public.coin_transactions to authenticated;
grant all on table public.coin_transactions to service_role;

grant select on table public.store_items to anon;
grant select on table public.store_items to authenticated;
grant all on table public.store_items to service_role;

grant select on table public.purchases to anon;
grant select on table public.purchases to authenticated;
grant all on table public.purchases to service_role;
