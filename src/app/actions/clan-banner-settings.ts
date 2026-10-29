"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { COSMETIC_COLOR_PRESETS } from "@/lib/cosmetics/color-presets";
import { NORMAL_CLAN_BANNERS } from "@/lib/clan/banner-catalog";

export async function updateClanBannerAction(gameSlug: string, clanId: string, itemSlug: string | null, paletteId: string = "graphite"): Promise<{ ok: true } | { ok: false; error: string }> {
  if (itemSlug !== null && !NORMAL_CLAN_BANNERS.some(design => design.sku === itemSlug) && !["clan_banner_slot", "clan_banner_midnight", "clan_banner_sunset"].includes(itemSlug)) return { ok: false, error: "배너를 확인해 주십시오." };
  if (!COSMETIC_COLOR_PRESETS.some(palette => palette.id === paletteId)) return { ok: false, error: "색상을 확인해 주십시오." };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!await hasClanPermission(client, user.id, clanId, "manage_clan_pool")) return { ok: false, error: "클랜 꾸미기 관리 권한이 없습니다." };
  const svc = createServiceRoleClient();
  const { data: clan, error } = await svc.from("clans").select("games!inner(slug)").eq("id", clanId).maybeSingle();
  if (error || !clan || (clan.games as unknown as { slug: string }).slug !== gameSlug) return { ok: false, error: "클랜을 찾을 수 없습니다." };
  const result = await svc.rpc("set_clan_banner", { p_actor_id: user.id, p_clan_id: clanId, p_item_slug: itemSlug, p_palette_id: paletteId });
  if (result.error || result.data?.ok !== true) return { ok: false, error: "보유한 배너만 적용할 수 있습니다. 새로고침 후 확인해 주십시오." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout");
  return { ok: true };
}
