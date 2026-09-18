"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import {
  AUCTION_ITEM_EXAMPLES,
  auctionItemValidationError,
  type ClanAuctionItem,
} from "@/lib/balance/auction-items";

type Result = { ok: true } | { ok: false; error: string };

async function officerContext(gameSlug: string, clanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const ctx = await loadMainClanContext(supabase, user.id, gameSlug, clanId);
  if (!ctx || ctx.role === "member") return null;
  return supabase;
}

function refreshCatalog(gameSlug: string, clanId: string) {
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
}

export async function saveClanAuctionItemAction(
  gameSlug: string,
  clanId: string,
  itemId: string | null,
  item: Omit<ClanAuctionItem, "id">,
): Promise<Result> {
  if (!item) return { ok: false, error: "아이템 정보를 확인해 주세요." };
  const validationError = auctionItemValidationError(item);
  if (validationError) return { ok: false, error: validationError };
  const supabase = await officerContext(gameSlug, clanId);
  if (!supabase) return { ok: false, error: "클랜 운영진만 아이템을 관리할 수 있습니다." };
  const values = { name: item.name.trim(), description: item.description.trim(), cost: item.cost, enabled: item.enabled };
  const result = itemId
    ? await supabase.from("clan_auction_items").update(values).eq("id", itemId).eq("clan_id", clanId).select("id").maybeSingle()
    : await supabase.from("clan_auction_items").insert({ ...values, clan_id: clanId }).select("id").single();
  if (result.error || !result.data) return {
    ok: false,
    error: result.error?.code === "23505" ? "같은 이름의 아이템이 있습니다." : "아이템을 저장하지 못했습니다. 권한과 입력값을 확인해 주세요.",
  };
  refreshCatalog(gameSlug, clanId);
  return { ok: true };
}

export async function deleteClanAuctionItemAction(
  gameSlug: string,
  clanId: string,
  itemId: string,
): Promise<Result> {
  const supabase = await officerContext(gameSlug, clanId);
  if (!supabase) return { ok: false, error: "클랜 운영진만 아이템을 관리할 수 있습니다." };
  const { data, error } = await supabase.from("clan_auction_items").delete().eq("id", itemId).eq("clan_id", clanId).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "아이템을 삭제하지 못했습니다. 이미 삭제됐는지 확인해 주세요." };
  refreshCatalog(gameSlug, clanId);
  return { ok: true };
}

export async function addClanAuctionItemExamplesAction(gameSlug: string, clanId: string): Promise<Result> {
  const supabase = await officerContext(gameSlug, clanId);
  if (!supabase) return { ok: false, error: "클랜 운영진만 아이템을 관리할 수 있습니다." };
  const { data, error: readError } = await supabase.from("clan_auction_items").select("id").eq("clan_id", clanId).limit(1);
  if (readError) return { ok: false, error: "아이템 목록을 불러오지 못했습니다." };
  if (data?.length) return { ok: false, error: "등록된 아이템이 있습니다. 아이템 추가에서 직접 등록해 주세요." };
  const { error } = await supabase.from("clan_auction_items").insert(AUCTION_ITEM_EXAMPLES.map((item) => ({ ...item, clan_id: clanId })));
  if (error) return { ok: false, error: "예시 아이템을 추가하지 못했습니다. 목록을 다시 확인해 주세요." };
  refreshCatalog(gameSlug, clanId);
  return { ok: true };
}
