-- Existing slot purchases retain the first banner; existing applied URLs stay until changed.
update public.store_items set name_ko='에메랄드 가드', asset_url='/clan-banners/emerald.svg' where slug='clan_banner_slot';
insert into public.store_items(slug,item_type,pool_source,name_ko,price_coins,asset_url)
values ('clan_banner_midnight','clan_deco','clan','미드나잇 오빗',100,'/clan-banners/midnight.svg'),
       ('clan_banner_sunset','clan_deco','clan','선셋 리지',100,'/clan-banners/sunset.svg');

-- WebP output only. All writes go through the authenticated, authorized server route.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('clan-profiles','clan-profiles',true,3145728,array['image/webp']);

create function public.set_clan_banner(p_actor_id uuid,p_clan_id uuid,p_item_slug text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_asset text;
begin
  if not exists(select 1 from public.clan_members where clan_id=p_clan_id and user_id=p_actor_id and status='active' and role in ('leader','officer')) then
    return jsonb_build_object('ok',false,'error','officer_required');
  end if;
  if p_item_slug is not null then
    -- Same purchase -> clan lock order as void_clan_store_purchase: never apply a voided item.
    select i.asset_url into v_asset from public.purchases p join public.store_items i on i.id=p.item_id
      where p.clan_id=p_clan_id and p.pool_source='clan' and p.voided_at is null
      and i.slug=p_item_slug and i.is_active and i.slug in ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset')
      and i.asset_url like '/clan-banners/%' for update of p;
    if not found then return jsonb_build_object('ok',false,'error','not_owned'); end if;
  end if;
  update public.clans set banner_url=v_asset where id=p_clan_id;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.set_clan_banner(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.set_clan_banner(uuid,uuid,text) to service_role;
CREATE OR REPLACE FUNCTION public.void_clan_store_purchase (
  p_actor_id uuid,
  p_purchase_id uuid,
  p_reason text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_p public.purchases%ROWTYPE;
  v_slug varchar(64);
  v_role public.clan_member_role;
  v_status public.clan_member_status;
  v_tx public.coin_transactions%ROWTYPE;
  v_refund int;
  v_new_balance int;
  r text;
BEGIN
  IF p_actor_id IS NULL OR p_purchase_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  r := trim(coalesce(p_reason, ''));

  IF length(r) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reason_too_short');
  END IF;

  SELECT
    p.* INTO v_p
  FROM
    public.purchases p
  WHERE
    p.id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_p.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_voided');
  END IF;

  IF v_p.pool_source IS DISTINCT FROM 'clan'::public.coin_pool_type THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_clan_pool');
  END IF;

  IF v_p.clan_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_purchase');
  END IF;

  IF v_p.user_id = p_actor_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'void_self_forbidden');
  END IF;

  SELECT
    cm.role,
    cm.status INTO v_role,
    v_status
  FROM
    public.clan_members cm
  WHERE
    cm.clan_id = v_p.clan_id
    AND cm.user_id = p_actor_id;

  IF NOT FOUND
    OR v_status IS DISTINCT FROM 'active'::public.clan_member_status
    OR v_role NOT IN ('leader'::public.clan_member_role, 'officer'::public.clan_member_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'officer_required');
  END IF;

  SELECT
    si.slug INTO v_slug
  FROM
    public.store_items si
  WHERE
    si.id = v_p.item_id;

  SELECT
    * INTO v_tx
  FROM
    public.coin_transactions ct
  WHERE
    ct.id = v_p.coin_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ledger_missing');
  END IF;

  IF v_tx.amount >= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_ledger');
  END IF;

  v_refund := -v_tx.amount;

  IF v_refund <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_ledger');
  END IF;

  UPDATE
    public.clans c
  SET
    coin_balance = c.coin_balance + v_refund
  WHERE
    c.id = v_p.clan_id
  RETURNING
    c.coin_balance INTO v_new_balance;

  INSERT INTO public.coin_transactions (
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
    created_by)
  VALUES (
    v_p.clan_id,
    NULL,
    'clan'::public.coin_pool_type,
    v_refund,
    'void_store_purchase',
    'purchase_void',
    p_purchase_id,
    '',
    v_new_balance,
    v_p.coin_transaction_id,
    p_actor_id);

  UPDATE
    public.purchases p
  SET
    voided_at = now(),
    voided_by = p_actor_id,
    void_reason = r
  WHERE
    p.id = p_purchase_id;

  IF v_slug IN ('clan_banner_slot','clan_banner_midnight','clan_banner_sunset') THEN
    UPDATE
      public.clans c
    SET
      banner_url = NULL
    WHERE
      c.id = v_p.clan_id AND (c.banner_url = (SELECT asset_url FROM public.store_items WHERE id=v_p.item_id) OR (v_slug = 'clan_banner_slot' AND c.banner_url NOT LIKE '/clan-banners/%'));
  END IF;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate_void');
END;
$$;

COMMENT ON FUNCTION public.void_clan_store_purchase (uuid, uuid, text) IS
  'D-STORE-03 — 클랜 풀 구매 무효화(구매자 본인 불가). 코인 환급·correction_of·void 표시·현재 적용한 배너 구매 무효화 시 banner_url 초기화. service_role 전용.';

REVOKE ALL ON FUNCTION public.void_clan_store_purchase (uuid, uuid, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.void_clan_store_purchase (uuid, uuid, text)
TO service_role;
