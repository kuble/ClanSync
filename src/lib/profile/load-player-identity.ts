import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { parseBattleTag } from "@/lib/game-auth/battle-tag";
import { namecardAppearance } from "./namecard";
import type { PlayerIdentity, PlayerProfileVisit } from "./visibility";
import { effectiveViewAltAccountRoles } from "@/lib/clan/view-alt-disclosure";

export async function loadPlayerIdentity(db: SupabaseClient<Database>, userId: string, clanId?: string, viewerId?: string): Promise<PlayerIdentity | null> {
  const { data, error } = await db.rpc("read_player_profile", { p_user_id: userId });
  if (error) throw new Error("플레이어 소개를 불러오지 못했습니다.");
  const profile = data as PlayerProfileVisit | null;
  if (!profile) return null;
  const membership = profile.memberships.find(item => item.clanId === clanId);
  const service: SupabaseClient<Database> = createServiceRoleClient();
  const [catalog, selections, linkedGames, clanProfile] = await Promise.all([
    service.from("nameplate_options").select("id,category,code,name_ko,unlock_source,price_coins").eq("is_active", true),
    service.from("user_namecard_selections").select("category,option_id,palette_id").eq("user_id", profile.userId),
    service.from("user_game_profiles").select("battle_tag,game_uid,riot_id,is_verified,games(slug,name_ko)").eq("user_id", profile.userId),
    clanId && membership ? loadClanProfile(db, service, userId, clanId, membership.gameSlug, viewerId) : undefined,
  ]);
  if (catalog.error || selections.error || linkedGames.error) throw new Error("플레이어 소개를 불러오지 못했습니다.");
  return {
    userId: profile.userId, intro: profile.intro ?? "", memberships: profile.memberships,
    ...(clanProfile ? { clanProfile: { ...clanProfile, ...(viewerId === userId && linkedGames.data.some(game => game.is_verified && game.games?.slug === membership?.gameSlug) ? { canManageAlts: true as const } : {}) } } : {}),
    appearance: namecardAppearance(catalog.data, selections.data),
    games: linkedGames.data.flatMap(game => game.games ? [{ gameSlug: game.games.slug, gameName: game.games.name_ko,
      accountId: game.is_verified ? (game.games.slug === "overwatch" ? parseBattleTag(game.battle_tag || game.game_uid) : ["valorant", "lol"].includes(game.games.slug) ? game.riot_id : null) : null,
    }] : []),
  };
}

/** Basic introduction facts are independent of statistics, but limited to current clan peers. */
async function loadClanProfile(db: SupabaseClient<Database>, service: SupabaseClient<Database>, userId: string, clanId: string, gameSlug: string, viewerId?: string): Promise<PlayerIdentity["clanProfile"]> {
  const viewer = await db.rpc("select_my_clan_membership", { p_clan_id: clanId });
  if (viewer.error) throw new Error("플레이어 기본 정보를 불러오지 못했습니다.");
  if (viewer.data?.[0]?.status !== "active") return undefined;
  const [person, member, settings] = await Promise.all([
    service.from("users").select("gender,birth_year").eq("id", userId).maybeSingle(),
    service.from("clan_members").select("joined_at").eq("clan_id", clanId).eq("user_id", userId).eq("status", "active").maybeSingle(),
    db.from("clan_settings").select("permissions").eq("clan_id", clanId).maybeSingle(),
  ]);
  if (person.error || member.error) throw new Error("플레이어 기본 정보를 불러오지 못했습니다.");
  if (!person.data || !member.data) return undefined;
  let altAccounts: string[] = [];
  if (viewerId === userId || (!settings.error && settings.data && effectiveViewAltAccountRoles(settings.data.permissions as Record<string, unknown>).includes(viewer.data[0].role))) {
    const alts = await db.from("user_alt_accounts").select("alt_nick,games!inner(slug)").eq("user_id", userId).eq("games.slug", gameSlug).order("alt_nick");
    if (alts.error) throw new Error("부계정을 불러오지 못했습니다.");
    altAccounts = alts.data.map(alt => alt.alt_nick);
  }
  return { gender: person.data.gender, birthYear: person.data.birth_year, clanJoinedAt: member.data.joined_at, altAccounts };
}
