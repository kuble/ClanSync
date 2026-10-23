"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { uuidPattern } from "@/lib/clan/board";
import { loadClanPersonalEmblemCollection } from "@/lib/clan/stats/load-clan-stats";
import { resolveFeaturedKeys } from "@/lib/personal-emblems/catalog";
import type { PersonalEmblemCollection } from "@/lib/personal-emblems/types";

type EmblemResult = { ok: true; collection: PersonalEmblemCollection } | { ok: false; error: string };

export async function savePersonalEmblemPicksAction(clanId: string, keys: string[]): Promise<EmblemResult> {
  if (typeof clanId !== "string" || !uuidPattern.test(clanId) || !Array.isArray(keys) || keys.length > 3
    || keys.some((key) => typeof key !== "string" || key.length === 0 || key.length > 160)
    || new Set(keys).size !== keys.length)
    return { ok: false, error: "서로 다른 대표 엠블럼을 최대 3개까지 선택해 주세요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  try {
    const collection = await loadClanPersonalEmblemCollection(supabase, user.id, clanId);
    if (!collection?.canFeature) return { ok: false, error: "대표 엠블럼을 변경할 수 없습니다." };
    const earned = new Set(collection.emblems.filter((emblem) => emblem.earned).map((emblem) => emblem.key));
    if (keys.some((key) => !earned.has(key))) return { ok: false, error: "현재 획득한 엠블럼만 선택할 수 있습니다." };
    const featuredKeys = resolveFeaturedKeys(collection.emblems, keys);
    const { error } = await createServiceRoleClient().from("clan_personal_emblem_picks").upsert({
      clan_id: clanId, user_id: user.id, emblem_keys: featuredKeys, updated_at: new Date().toISOString(),
    }, { onConflict: "clan_id,user_id" });
    if (error) return { ok: false, error: "대표 엠블럼을 저장하지 못했습니다. 다시 시도해 주세요." };
    revalidatePath("/profile");
    revalidatePath(`/games/${collection.gameSlug}/clan/${clanId}/stats`);
    revalidatePath(`/games/${collection.gameSlug}/clan/${clanId}/emblems`);
    return { ok: true, collection: { ...collection, featuredKeys } };
  } catch {
    return { ok: false, error: "대표 엠블럼을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
