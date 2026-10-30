import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { parseBattleTag } from "./battle-tag";

/** Call after authorizing the parent view; return only its requested game identities. */
export async function loadGamePlayerNames(gameId: string, userIds: string[]) {
  const names = new Map<string, string>();
  const ids = [...new Set(userIds)];
  const service = createServiceRoleClient();
  for (let offset = 0; offset < ids.length; offset += 500) {
    const { data, error } = await service.from("user_game_profiles")
      .select("user_id,battle_tag,riot_id,game_uid,games!inner(slug)")
      .eq("game_id", gameId).eq("is_verified", true).in("user_id", ids.slice(offset, offset + 500));
    if (error) throw new Error("게임 ID를 불러오지 못했습니다.");
    for (const row of data) {
      const game = Array.isArray(row.games) ? row.games[0] : row.games;
      const name = game?.slug === "overwatch" ? parseBattleTag(row.battle_tag || row.game_uid)
        : ["valorant", "lol"].includes(game?.slug) ? row.riot_id?.trim() : null;
      if (name) names.set(row.user_id, name);
    }
  }
  return names;
}

export async function loadClanPlayerNames(clanId: string, userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const { data, error } = await createServiceRoleClient().from("clans").select("game_id").eq("id", clanId).single();
  if (error) throw new Error("게임 정보를 불러오지 못했습니다.");
  return loadGamePlayerNames(data.game_id, userIds);
}
