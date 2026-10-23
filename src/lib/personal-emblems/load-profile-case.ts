import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PlayerProfileVisit } from "@/lib/profile/visibility";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { loadClanPersonalEmblemCollection } from "@/lib/clan/stats/load-clan-stats";
import { loadOwnedPersonalEmblemCase } from "./load-owned-case";
import { resolveAccountFeaturedKeys, resolveFeaturedKeys } from "./catalog";
import type { PersonalEmblemCollection } from "./types";

/** Visitor sources must pass both opted-in profile visibility and current clan disclosure. */
export async function loadProfilePersonalEmblemCase(client: SupabaseClient<Database>, userId: string): Promise<PersonalEmblemCollection | null> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  if (user.id === userId) return loadOwnedPersonalEmblemCase(client);
  const visit = await client.rpc("read_player_profile", { p_user_id: userId });
  if (visit.error) throw new Error("프로필 공개 설정을 확인하지 못했습니다.");
  const profile = visit.data as unknown as PlayerProfileVisit | null;
  if (!profile?.memberships?.length) return null;
  const permitted = await Promise.all(profile.memberships.filter(membership => membership.showEmblems)
    .map(membership => loadClanPersonalEmblemCollection(client, user.id, membership.clanId, userId)));
  const sources = permitted.filter((source): source is PersonalEmblemCollection => !!source);
  if (!sources.length) return null;
  const picks = await createServiceRoleClient().from("account_personal_emblem_picks").select("emblem_keys").eq("user_id", userId).maybeSingle();
  if (picks.error) throw new Error("대표 엠블럼을 불러오지 못했습니다.");
  const keys = picks.data?.emblem_keys ?? sources.flatMap(source => resolveFeaturedKeys(source.emblems, source.featuredKeys).map(key => source.clanId + ":" + key));
  return { ...sources[0], clanId: "", clanName: "", gameSlug: "", sources,
    accountFeaturedKeys: resolveAccountFeaturedKeys(sources, keys) };
}
