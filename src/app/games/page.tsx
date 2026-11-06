import { getTranslator } from "@/lib/i18n/server";
import { Suspense } from "react";
import { gameProfileIdentity } from "@/lib/game-auth/game-profile-identity";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GameCardGrid } from "@/components/games/game-card-grid";
import { EntryBrand } from "@/components/entry/entry-brand";
import { HeaderActions } from "@/components/ui/header-actions";
import { AccountNotifications } from "@/components/onboarding/account-notifications";
import type { ClanStatus, GameCardState } from "@/lib/routing/game-card-router";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { fetchMyClanJoinRequests } from "@/lib/clan/fetch-my-clan-join-requests";
import styles from "@/components/entry/entry.module.css";

const gameOrder = ["overwatch", "valorant", "lol", "deadlock"];

export async function generateMetadata() {
  const tx = await getTranslator();
  return { title: tx("게임 선택 · ClanSync") };
}

export default async function GamesPage() {
  const tx = await getTranslator();
  const supabase = await getRequestClient();
  const user = await getRequestUser();
  if (!user) redirect("/sign-in?next=/games");

  const [
    { data: games, error: gameError },
    { data: ugRows, error: verificationError },
    { data: activeByGame, error: membershipError },
    { data: myJoinRows, error: pendingError },
  ] = await Promise.all([
    supabase.from("games").select("id, slug, name_ko, is_active").order("slug"),
    supabase.from("user_game_profiles").select("game_id,battle_tag,riot_id,game_uid").eq("user_id", user.id),
    supabase.rpc("my_active_clans_by_game"),
    fetchMyClanJoinRequests(supabase),
  ]);

  const loadError = gameError ?? verificationError ?? membershipError ?? pendingError;
  if (loadError) console.error("[games] 목록 조회 실패:", loadError.message);
  const registered = new Map((ugRows ?? []).map((row) => [row.game_id, gameProfileIdentity(games?.find(game => game.id === row.game_id)?.slug ?? "", row) !== null]));
  const memberByGame = new Map<string, { clanId: string; clanName: string }>();
  for (const row of activeByGame ?? []) {
    if (!memberByGame.has(row.game_id)) memberByGame.set(row.game_id, { clanId: row.clan_id, clanName: row.clan_name });
  }

  const pendingRows = myJoinRows?.filter((row) => row.status === "pending") ?? [];
  const pendingClanIds = [...new Set(pendingRows.map((row) => row.clan_id))];
  const clanNamesById = new Map<string, string>();
  if (pendingClanIds.length > 0) {
    const { data: nameRows } = await supabase.from("clans").select("id, name").in("id", pendingClanIds);
    for (const clan of nameRows ?? []) clanNamesById.set(clan.id, clan.name);
  }

  const pendingByGame = new Map<string, { clanId: string; clanName: string }>();
  for (const row of pendingRows) {
    if (!pendingByGame.has(row.game_id)) pendingByGame.set(row.game_id, { clanId: row.clan_id, clanName: clanNamesById.get(row.clan_id) ?? "" });
  }

  const cards: (GameCardState & { title: string })[] = [...(games ?? [])]
    .sort((a, b) => {
      const aIndex = gameOrder.indexOf(a.slug);
      const bIndex = gameOrder.indexOf(b.slug);
      return (aIndex < 0 ? gameOrder.length : aIndex) - (bIndex < 0 ? gameOrder.length : bIndex);
    })
    .map((game) => {
      const member = memberByGame.get(game.id);
      const pending = pendingByGame.get(game.id);
      const clanStatus: ClanStatus = member ? "member" : pending ? "pending" : "none";
      return {
        slug: game.slug,
        title: game.name_ko,
        auth: registered.get(game.id) ?? false,
        clanStatus,
        clanId: member?.clanId ?? pending?.clanId ?? null,
        clanName: member?.clanName ?? pending?.clanName ?? null,
        disabled: game.is_active === false,
      };
    });

  return (
    <div className={styles.gamesPage}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <EntryBrand />
          <HeaderActions notifications={<Suspense fallback={<span className="size-8 sm:size-9" aria-hidden />}><AccountNotifications /></Suspense>} />
        </div>
      </header>
      <main className={styles.gamesContent}>
        {loadError ? (
          <div className={styles.empty} role="alert"><h1 className={styles.gameHeading}>{tx("게임 목록을 불러오지 못했습니다")}</h1><p className="mt-3">{tx("잠시 후 다시 시도해 주십시오.")}</p><Link className={`${styles.secondaryButton} mt-5`} href="/games">{tx("다시 불러오기")}</Link></div>
        ) : cards.length ? <GameCardGrid cards={cards} /> : (
          <div className={styles.empty}><h1 className={styles.gameHeading}>{tx("게임 선택")}</h1><p className="mt-3">{tx("아직 등록된 게임이 없습니다.")}</p></div>
        )}
      </main>
    </div>
  );
}
