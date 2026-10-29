-- Keep historical ten-slot entitlements and their original ledger intact.
update public.store_items set is_active=false where slug='clan_emoji_slots_10';
insert into public.store_items(slug,item_type,pool_source,name_ko,price_coins)
values('clan_emoji_slots_3','clan_deco','clan','공용 이모티콘 3슬롯',100);

-- Only the server-controlled new slot SKU may bypass one-time clan ownership.
alter table public.purchases add column repeatable boolean not null default false;
alter table public.purchases add constraint purchases_repeatable_clan_only check(not repeatable or pool_source='clan');
drop index public.purchases_one_clan_item_active_idx;
create unique index purchases_one_clan_item_active_idx on public.purchases(clan_id,item_id)
where pool_source='clan' and voided_at is null and not repeatable;

create or replace function public.clan_cosmetic_access(p_clan_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_access jsonb;
begin
  if auth.uid() is null or not public.is_active_clan_member(p_clan_id) then return '{}'::jsonb; end if;
  select jsonb_build_object(
    'emojiSlots',coalesce(sum(case i.slug when 'clan_emoji_slots_10' then 10 when 'clan_emoji_slots_3' then 3 else 0 end),0),
    'frames',coalesce(bool_or(i.slug='clan_photo_frames'),false),
    'stickers',coalesce(bool_or(i.slug='clan_photo_stickers'),false)) into v_access
  from public.purchases p join public.store_items i on i.id=p.item_id
  where p.clan_id=p_clan_id and p.pool_source='clan' and p.voided_at is null;
  return v_access;
end; $$;
revoke all on function public.clan_cosmetic_access(uuid) from public,anon;
grant execute on function public.clan_cosmetic_access(uuid) to authenticated;

-- Stable slot positions preserve uploads when an operator voids a pack.
alter table public.clan_emojis add column slot_index integer;
with ranked as (
  select id,row_number() over(partition by clan_id order by created_at,id)::integer as slot
  from public.clan_emojis
) update public.clan_emojis e set slot_index=r.slot from ranked r where r.id=e.id;
alter table public.clan_emojis alter column slot_index set not null;
alter table public.clan_emojis add constraint clan_emojis_slot_positive check(slot_index>0);
create unique index clan_emojis_slot_idx on public.clan_emojis(clan_id,slot_index);
drop policy clan_emoji_read on public.clan_emojis;
create policy clan_emoji_read on public.clan_emojis for select to authenticated
using(public.is_active_clan_member(clan_id) and slot_index <= (public.clan_cosmetic_access(clan_id)->>'emojiSlots')::integer);

create or replace function public.add_clan_emoji(p_actor_id uuid,p_clan_id uuid,p_id uuid,p_name text,p_image_path text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_slots integer; v_slot integer;
begin
  if not exists(select 1 from public.clan_members where clan_id=p_clan_id and user_id=p_actor_id and status='active' and role in ('leader','officer')) then
    return jsonb_build_object('ok',false,'error','officer_required'); end if;
  -- Match voiding's purchase -> clan lock order; serialize all slot allocation.
  perform p.id from public.purchases p join public.store_items i on i.id=p.item_id
    where p.clan_id=p_clan_id and p.pool_source='clan' and p.voided_at is null
      and i.slug in ('clan_emoji_slots_10','clan_emoji_slots_3') order by p.id for update of p;
  perform id from public.clans where id=p_clan_id for update;
  select coalesce(sum(case i.slug when 'clan_emoji_slots_10' then 10 when 'clan_emoji_slots_3' then 3 else 0 end),0)::integer into v_slots
    from public.purchases p join public.store_items i on i.id=p.item_id
    where p.clan_id=p_clan_id and p.pool_source='clan' and p.voided_at is null;
  if v_slots=0 then return jsonb_build_object('ok',false,'error','not_owned'); end if;
  select slot into v_slot from generate_series(1,v_slots) slot
    where not exists(select 1 from public.clan_emojis e where e.clan_id=p_clan_id and e.slot_index=slot)
    order by slot limit 1;
  if v_slot is null then return jsonb_build_object('ok',false,'error','slots_full'); end if;
  insert into public.clan_emojis(id,clan_id,name,image_path,slot_index) values(p_id,p_clan_id,p_name,p_image_path,v_slot);
  return jsonb_build_object('ok',true);
exception when unique_violation then return jsonb_build_object('ok',false,'error','duplicate_name');
end; $$;
revoke all on function public.add_clan_emoji(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.add_clan_emoji(uuid,uuid,uuid,text,text) to service_role;

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

    if v_item.slug <> 'clan_emoji_slots_3' and exists (
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
      void_reason,
      repeatable
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
      null,
      v_item.slug = 'clan_emoji_slots_3'
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

revoke all on function public.apply_store_purchase(uuid, uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.apply_store_purchase(uuid, uuid, text, uuid) to service_role;
