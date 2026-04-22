import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * 클랜 풀 스토어 구매(무효 아님)가 slug 기준으로 존재하는지.
 */
export async function clanHasActivePurchaseForItemSlug(
  svc: SupabaseClient<Database>,
  clanId: string,
  itemSlug: string,
): Promise<boolean> {
  const { data: item } = await svc
    .from("store_items")
    .select("id")
    .eq("slug", itemSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!item?.id) return false;

  const { data: row } = await svc
    .from("purchases")
    .select("id")
    .eq("clan_id", clanId)
    .eq("item_id", item.id)
    .eq("pool_source", "clan")
    .is("voided_at", null)
    .maybeSingle();

  return row != null;
}
