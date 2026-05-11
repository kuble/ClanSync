-- D-STORE-03 확장 — 개인 풀 스토어 구매 운영자 무효화(같은 클랜 맥락).
-- 구매자 본인 불가. actor는 p_context_clan_id에서 leader/officer·active.
-- 구매자는 p_context_clan_id의 active 멤버여야 함. 코인은 구매자 개인 풀로 환급.

CREATE OR REPLACE FUNCTION public.void_personal_store_purchase (
  p_actor_id uuid,
  p_context_clan_id uuid,
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
  v_buyer_status public.clan_member_status;
  v_tx public.coin_transactions%ROWTYPE;
  v_refund int;
  v_new_balance int;
  r text;
BEGIN
  IF p_actor_id IS NULL
    OR p_context_clan_id IS NULL
    OR p_purchase_id IS NULL THEN
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

  IF v_p.pool_source IS DISTINCT FROM 'personal'::public.coin_pool_type THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_personal_pool');
  END IF;

  IF v_p.clan_id IS NOT NULL THEN
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
    cm.clan_id = p_context_clan_id
    AND cm.user_id = p_actor_id;

  IF NOT FOUND
    OR v_status IS DISTINCT FROM 'active'::public.clan_member_status
    OR v_role NOT IN ('leader'::public.clan_member_role, 'officer'::public.clan_member_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'officer_required');
  END IF;

  SELECT
    cm.status INTO v_buyer_status
  FROM
    public.clan_members cm
  WHERE
    cm.clan_id = p_context_clan_id
    AND cm.user_id = v_p.user_id;

  IF NOT FOUND
    OR v_buyer_status IS DISTINCT FROM 'active'::public.clan_member_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'buyer_not_clan_member');
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

  IF v_tx.pool_type IS DISTINCT FROM 'personal'::public.coin_pool_type
    OR v_tx.user_id IS DISTINCT FROM v_p.user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_ledger');
  END IF;

  v_refund := -v_tx.amount;

  IF v_refund <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_ledger');
  END IF;

  UPDATE
    public.users u
  SET
    coin_balance = u.coin_balance + v_refund
  WHERE
    u.id = v_p.user_id
  RETURNING
    u.coin_balance INTO v_new_balance;

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
    NULL,
    v_p.user_id,
    'personal'::public.coin_pool_type,
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

  IF v_slug = 'profile_entrance_fx' THEN
    DELETE FROM public.user_nameplate_selections uns USING public.nameplate_options no
    WHERE uns.user_id = v_p.user_id
      AND uns.option_id = no.id
      AND no.code LIKE 'pf_entrance_store:%';

    DELETE FROM public.user_nameplate_inventory uni USING public.nameplate_options no
    WHERE uni.user_id = v_p.user_id
      AND uni.option_id = no.id
      AND no.code LIKE 'pf_entrance_store:%';
  END IF;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate_void');
END;
$$;

COMMENT ON FUNCTION public.void_personal_store_purchase (uuid, uuid, uuid, text) IS
  'D-STORE-03 — 개인 풀 구매 무효화(구매자 본인 불가, 클랜 맥락의 운영진만). 환급·correction_of·void·profile_entrance_fx 시 네임플레이트 스토어 frame 정리. service_role 전용.';

REVOKE ALL ON FUNCTION public.void_personal_store_purchase (uuid, uuid, uuid, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.void_personal_store_purchase (uuid, uuid, uuid, text)
TO service_role;
