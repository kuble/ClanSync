-- M6b — profile_entrance_fx 구매 시 클랜 소속 게임의 네임플레이트 frame 보유 부여 (D-PROFILE-01)

insert into public.nameplate_options (
  game_id,
  category,
  code,
  name_ko,
  unlock_source,
  is_active
)
select
  g.id,
  'frame'::public.nameplate_category,
  'pf_entrance_store:' || g.slug,
  '프로필 입장 효과 (스토어)',
  'store'::public.nameplate_unlock_source,
  true
from public.games g
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- apply_store_purchase: 개인 상품 profile_entrance_fx 에 대해 user_nameplate_inventory 부여
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
  v_game_id uuid;
  v_np_id uuid;
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

  if p_item_slug = 'profile_entrance_fx'
     and v_item.pool_source = 'personal'::public.coin_pool_type
  then
    select c.game_id into v_game_id from public.clans c where c.id = p_context_clan_id;
    if v_game_id is not null then
      select no.id into v_np_id
        from public.nameplate_options no
       where no.game_id = v_game_id
         and no.unlock_source = 'store'::public.nameplate_unlock_source
         and no.category = 'frame'::public.nameplate_category
         and no.code like 'pf_entrance_store:%'
         and no.is_active = true
       limit 1;
      if v_np_id is not null then
        insert into public.user_nameplate_inventory (user_id, option_id)
        values (p_actor_id, v_np_id)
        on conflict (user_id, option_id) do nothing;
      end if;
    end if;
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
  'M6b — 잔액·원장·구매 + profile_entrance_fx 시 네임플레이트 frame 보유 부여. service_role만 EXECUTE.';

revoke all on function public.apply_store_purchase(uuid, uuid, text, uuid) from public;

grant execute on function public.apply_store_purchase(uuid, uuid, text, uuid) to service_role;
