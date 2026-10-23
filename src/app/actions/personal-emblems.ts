"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { uuidPattern } from "@/lib/clan/board";
import { loadOwnedPersonalEmblemCase } from "@/lib/personal-emblems/load-owned-case";
import { caseEmblems, resolveAccountFeaturedKeys } from "@/lib/personal-emblems/catalog";
import type { PersonalEmblemCollection } from "@/lib/personal-emblems/types";

type EmblemResult = { ok: true; collection: PersonalEmblemCollection } | { ok: false; error: string };

export async function savePersonalEmblemPicksAction(keys: string[], contextClanId?: string): Promise<EmblemResult> {
  if ((contextClanId !== undefined && (typeof contextClanId !== "string" || !uuidPattern.test(contextClanId))) || !Array.isArray(keys) || keys.length > 3
    || keys.some((key) => typeof key !== "string" || key.length < 38 || key.length > 197 || !uuidPattern.test(key.slice(0, 36)) || key[36] !== ":")
    || new Set(keys).size !== keys.length)
    return { ok: false, error: "서로 다른 대표 엠블럼을 최대 3개까지 선택해 주세요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  try {
    const collection = await loadOwnedPersonalEmblemCase(supabase, contextClanId);
    if (!collection?.canFeature) return { ok: false, error: "대표 엠블럼을 변경할 수 없습니다." };
    const earned = new Set(caseEmblems(collection.sources ?? []).filter((emblem) => emblem.earned).map((emblem) => emblem.key));
    if (keys.some((key) => !earned.has(key))) return { ok: false, error: "현재 획득한 엠블럼만 선택할 수 있습니다." };
    const accountFeaturedKeys = resolveAccountFeaturedKeys(collection.sources ?? [], keys);
    const { error } = await createServiceRoleClient().from("account_personal_emblem_picks").upsert({
      user_id: user.id, emblem_keys: accountFeaturedKeys, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return { ok: false, error: "대표 엠블럼을 저장하지 못했습니다. 다시 시도해 주세요." };
    revalidatePath("/profile");
    revalidatePath("/profile/emblems");
    revalidatePath(`/profile/${user.id}`);
    revalidatePath(`/profile/${user.id}/emblems`);
    for (const source of collection.sources ?? []) {
      revalidatePath(`/games/${source.gameSlug}/clan/${source.clanId}/stats`);
      revalidatePath(`/games/${source.gameSlug}/clan/${source.clanId}/emblems`);
    }
    return { ok: true, collection: { ...collection, accountFeaturedKeys } };
  } catch {
    return { ok: false, error: "대표 엠블럼을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
