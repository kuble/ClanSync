"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { isMvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export type ClanStorePurchaseResult =
  | { ok: true; purchaseId: string }
  | { ok: false; error: string };

function mapRpcError(code: string): string {
  switch (code) {
    case "invalid_args":
      return "요청이 올바르지 않습니다.";
    case "item_not_found":
      return "판매 중인 상품이 아닙니다.";
    case "clan_not_found":
      return "클랜을 찾을 수 없습니다.";
    case "not_clan_member":
      return "클랜 멤버만 구매할 수 있습니다.";
    case "premium_required":
      return "Premium 클랜에서만 구매할 수 있는 상품입니다.";
    case "already_purchased":
      return "이미 구매한 상품입니다.";
    case "insufficient_coins":
      return "코인이 부족합니다.";
    case "officer_required":
      return "클랜 풀 지출은 운영진만 할 수 있습니다.";
    case "duplicate_checkout":
      return "이미 처리된 결제 요청입니다. 새로고침 후 확인해 주세요.";
    case "invalid_pool":
      return "상품 설정 오류입니다. 관리자에게 문의해 주세요.";
    default:
      return "구매 처리에 실패했습니다.";
  }
}

function parseRpcPayload(raw: unknown): {
  ok: boolean;
  error?: string;
  purchase_id?: string;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "unknown" };
  }
  const o = raw as Record<string, unknown>;
  const ok = o.ok === true;
  const error = typeof o.error === "string" ? o.error : undefined;
  const purchase_id = typeof o.purchase_id === "string" ? o.purchase_id : undefined;
  return { ok, error, purchase_id };
}

export async function purchaseStoreItemAction(
  gameSlug: string,
  clanId: string,
  itemSlug: string,
): Promise<ClanStorePurchaseResult> {
  if (!isMvpStoreSlug(itemSlug)) {
    return { ok: false, error: "지원하지 않는 상품입니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();
  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: itemRow } = await svc
    .from("store_items")
    .select("pool_source")
    .eq("slug", itemSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!itemRow) {
    return { ok: false, error: "판매 중인 상품이 아닙니다." };
  }

  const pool = itemRow.pool_source as "clan" | "personal";

  if (pool === "clan") {
    const allowed = await hasClanPermission(
      supabase,
      user.id,
      clanId,
      "manage_clan_pool",
    );
    if (!allowed) {
      return { ok: false, error: "클랜 코인 지출 권한이 없습니다." };
    }
  }

  const checkoutId = randomUUID();
  const { data: rpcRaw, error: rpcErr } = await svc.rpc("apply_store_purchase", {
    p_actor_id: user.id,
    p_context_clan_id: clanId,
    p_item_slug: itemSlug,
    p_checkout_id: checkoutId,
  });

  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  const parsed = parseRpcPayload(rpcRaw);
  if (!parsed.ok) {
    return { ok: false, error: mapRpcError(parsed.error ?? "unknown") };
  }
  if (!parsed.purchase_id) {
    return { ok: false, error: "구매 처리에 실패했습니다." };
  }

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/store`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  return { ok: true, purchaseId: parsed.purchase_id };
}

export type VoidClanStorePurchaseResult =
  | { ok: true }
  | { ok: false; error: string };

function mapVoidRpcError(code: string): string {
  switch (code) {
    case "invalid_args":
      return "요청이 올바르지 않습니다.";
    case "reason_too_short":
      return "무효화 사유를 네 글자 이상 입력해 주세요.";
    case "not_found":
      return "구매 내역을 찾을 수 없습니다.";
    case "already_voided":
      return "이미 무효 처리된 구매입니다.";
    case "not_clan_pool":
      return "클랜 풀 구매만 무효화할 수 있습니다.";
    case "not_personal_pool":
      return "개인 풀 구매만 무효화할 수 있습니다.";
    case "buyer_not_clan_member":
      return "구매자가 이 클랜의 활동 멤버가 아니면 무효화할 수 없습니다.";
    case "invalid_purchase":
      return "구매 데이터가 올바르지 않습니다.";
    case "void_self_forbidden":
      return "구매 당사자는 무효화할 수 없습니다. 다른 운영진에게 요청해 주세요.";
    case "officer_required":
      return "운영진만 무효화할 수 있습니다.";
    case "ledger_missing":
    case "invalid_ledger":
      return "코인 원장을 확인할 수 없습니다. 관리자에게 문의해 주세요.";
    case "duplicate_void":
      return "이미 처리된 요청입니다. 새로고침 후 확인해 주세요.";
    default:
      return "무효화 처리에 실패했습니다.";
  }
}

function parseVoidRpcPayload(raw: unknown): { ok: boolean; error?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "unknown" };
  }
  const o = raw as Record<string, unknown>;
  if (o.ok === true) return { ok: true };
  const error = typeof o.error === "string" ? o.error : undefined;
  return { ok: false, error };
}

/** D-STORE-03 — 클랜 풀 구매만. 구매자 본인·일반 멤버 불가 (RPC 검증). */
export async function voidClanStorePurchaseAction(
  gameSlug: string,
  clanId: string,
  purchaseId: string,
  reason: string,
): Promise<VoidClanStorePurchaseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_pool",
  );
  if (!allowed) {
    return { ok: false, error: "클랜 풀·스토어 운영 권한이 없습니다." };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();
  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: rpcRaw, error: rpcErr } = await svc.rpc("void_clan_store_purchase", {
    p_actor_id: user.id,
    p_purchase_id: purchaseId,
    p_reason: reason,
  });

  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  const parsed = parseVoidRpcPayload(rpcRaw);
  if (!parsed.ok) {
    return { ok: false, error: mapVoidRpcError(parsed.error ?? "unknown") };
  }

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/store`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  return { ok: true };
}

/** D-STORE-03 — 개인 풀 구매. 구매자 본인·일반 멤버 불가(RPC 검증). */
export async function voidPersonalStorePurchaseAction(
  gameSlug: string,
  clanId: string,
  purchaseId: string,
  reason: string,
): Promise<VoidClanStorePurchaseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_pool",
  );
  if (!allowed) {
    return { ok: false, error: "클랜 풀·스토어 운영 권한이 없습니다." };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();
  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: rpcRaw, error: rpcErr } = await svc.rpc("void_personal_store_purchase", {
    p_actor_id: user.id,
    p_context_clan_id: clanId,
    p_purchase_id: purchaseId,
    p_reason: reason,
  });

  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  const parsed = parseVoidRpcPayload(rpcRaw);
  if (!parsed.ok) {
    return { ok: false, error: mapVoidRpcError(parsed.error ?? "unknown") };
  }

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/store`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  return { ok: true };
}
