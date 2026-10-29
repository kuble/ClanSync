import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NamecardResult } from "./namecard";

export async function loadNamecard(userId: string): Promise<NamecardResult> {
  const db = await createClient();
  const [catalog, owned, selections, balance] = await Promise.all([
    db.from("nameplate_options").select("id,category,code,name_ko,unlock_source,price_coins,created_at").eq("is_active", true).order("code"),
    db.from("user_nameplate_inventory").select("option_id").eq("user_id", userId),
    db.from("user_namecard_selections").select("category,option_id").eq("user_id", userId),
    db.from("users").select("coin_balance").eq("id", userId).single(),
  ]);
  if (catalog.error || owned.error || selections.error || balance.error) return { ok: false, error: "네임카드를 불러오지 못했습니다. 새로고침 후 다시 시도해 주십시오." };
  return { ok: true, state: { catalog: catalog.data ?? [], owned: (owned.data ?? []).map((item) => item.option_id), selections: selections.data ?? [], coinBalance: balance.data.coin_balance } };
}
