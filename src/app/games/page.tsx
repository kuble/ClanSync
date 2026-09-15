import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { GameCardGrid } from "@/components/games/game-card-grid";
import { EntryBrand } from "@/components/entry/entry-brand";
import type { ClanStatus, GameCardState } from "@/lib/routing/game-card-router";
import { signOutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchMyClanJoinRequests } from "@/lib/clan/fetch-my-clan-join-requests";
import styles from "@/components/entry/entry.module.css";

const EMOJI: Record<string, string> = { overwatch: "🎮", valorant: "🎯", lol: "⚔️", pubg: "🪖" };
const gameOrder = ["overwatch", "valorant", "lol", "pubg"];

export const metadata = { title: "게임 선택 · ClanSync" };

export default async function GamesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/games");

  const [
    { data: games, error: gameError },
    { data: ugRows, error: verificationError },
    { data: activeByGame, error: membershipError },
    { data: myJoinRows, error: pendingError },
    { data: profile },
  ] = await Promise.all([
    supabase.from("games").select("id, slug, name_ko, is_active").order("slug"),
    supabase.from("user_game_profiles").select("game_id, is_verified").eq("user_id", user.id),
    supabase.rpc("my_active_clans_by_game"),
    fetchMyClanJoinRequests(supabase),
    supabase.from("users").select("nickname").eq("id", user.id).maybeSingle(),
  ]);

  const loadError = gameError ?? verificationError ?? membershipError ?? pendingError;
  if (loadError) console.error("[games] 목록 조회 실패:", loadError.message);
  const nickname = profile?.nickname || "플레이어";
  const verified = new Map((ugRows ?? []).map((row) => [row.game_id, row.is_verified === true]));
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

  const cards: (GameCardState & { title: string; emoji: string })[] = [...(games ?? [])]
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
        emoji: EMOJI[game.slug] ?? "🎮",
        auth: verified.get(game.id) ?? false,
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
          <details className={styles.profileMenu}>
            <summary className={styles.profileSummary} aria-label="프로필 메뉴">
              <span className={styles.avatar}>{nickname.slice(0, 1)}</span><ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div className={styles.profileDropdown}>
              <div className={styles.profileIdentity}><strong>{nickname}</strong><p>{user.email}</p></div>
              <Link href="/profile"><UserRound size={16} aria-hidden="true" />프로필</Link>
              <form action={signOutAction}><button type="submit"><LogOut size={16} aria-hidden="true" />로그아웃</button></form>
            </div>
          </details>
        </div>
      </header>
      <main className={styles.gamesContent}>
        {loadError ? (
          <div className={styles.empty} role="alert"><h1 className={styles.gameHeading}>게임 목록을 불러오지 못했어요</h1><p className="mt-3">잠시 후 다시 시도해 주세요.</p><Link className={`${styles.secondaryButton} mt-5`} href="/games">다시 불러오기</Link></div>
        ) : cards.length ? <GameCardGrid cards={cards} /> : (
          <div className={styles.empty}><h1 className={styles.gameHeading}>게임 선택</h1><p className="mt-3">아직 등록된 게임이 없습니다.</p></div>
        )}
      </main>
    </div>
  );
}
