import { parseBattleTag } from "./battle-tag";
import { parseRiotId } from "./riot-id";

export function gameProfileIdentity(gameSlug: string, profile?: {
  battle_tag?: string | null; riot_id?: string | null; game_uid?: string | null;
} | null): string | null {
  if (!profile) return null;
  if (gameSlug === "overwatch") return parseBattleTag(profile.battle_tag || profile.game_uid || "");
  if (gameSlug === "valorant" || gameSlug === "lol") return parseRiotId(profile.riot_id || "");
  return null;
}
