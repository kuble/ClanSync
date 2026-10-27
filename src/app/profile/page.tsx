import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import {
  ProfileGameDecorations,
  type DecorationGame,
} from "@/components/profile/profile-game-decorations";
import { ProfileDeleteAccountButton } from "@/components/profile/profile-delete-account-button";
import { ProfileJoinRequests } from "@/components/profile/profile-join-requests";
import { ProfileIdentity, type ProfileMembership } from "@/components/profile/profile-identity";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { fetchMyClanJoinRequests } from "@/lib/clan/fetch-my-clan-join-requests";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ProfilePanels } from "@/components/profile/profile-panels";
import { ProfileAutoLogin } from "@/components/profile/profile-auto-login";
import { loadNamecard } from "@/lib/profile/load-namecard";
import { profileBattleTag } from "@/lib/game-auth/battle-tag";
import { cookies } from "next/headers";
import { getSessionMaxAge, REMEMBERED_SESSION_SECONDS } from "@/lib/supabase/session-cookies";
import styles from "@/components/profile/profile.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "플레이어 프로필 · ClanSync" };


function genderLabel(g: string): string {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  return "비공개";
}

type JoinRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "canceled";
  applied_at: string;
  resolved_at: string | null;
  reject_reason: string | null;
  message: string;
  clans: { name: string } | null;
  games: { slug: string; name_ko: string } | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/profile");

  // 요청 시각 기준 7일 전 필터 (Async Server Component; 시계 기준값)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { data: row },
    { data: ugpRows },
    { data: gameCatalog },
    namecard,
    { data: altRowsRaw },
    { data: rolePreferences },
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "email, birth_year, gender, language, coin_balance, auto_login, created_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_game_profiles")
      .select("game_id, game_uid, battle_tag, riot_id, is_verified, games ( id, slug, name_ko )")
      .eq("user_id", user.id),
    supabase.from("games").select("id,slug,name_ko,is_active").order("slug"),
    loadNamecard(user.id),
    supabase
      .from("user_alt_accounts")
      .select("game_id, alt_nick")
      .eq("user_id", user.id)
      .order("alt_nick"),
    supabase.from("profile_role_preferences").select("game_id, ranking").eq("user_id", user.id),
  ]);

  const { data: rawJoinFlat, error: rawJoinFlatErr } =
    await fetchMyClanJoinRequests(supabase);

  const clanIdsForJoin = [
    ...new Set((rawJoinFlat ?? []).map((r) => r.clan_id).filter(Boolean)),
  ];
  const gameIdsForJoin = [
    ...new Set((rawJoinFlat ?? []).map((r) => r.game_id).filter(Boolean)),
  ];

  const [joinClansRes, joinGamesRes] = await Promise.all([
    clanIdsForJoin.length > 0
      ? supabase.from("clans").select("id, name").in("id", clanIdsForJoin)
      : Promise.resolve({
          data: [] as { id: string; name: string }[],
          error: null as null,
        }),
    gameIdsForJoin.length > 0
      ? supabase.from("games").select("id, slug, name_ko").in("id", gameIdsForJoin)
      : Promise.resolve({
          data: [] as { id: string; slug: string; name_ko: string }[],
          error: null as null,
        }),
  ]);

  const clanNameById = new Map(
    (joinClansRes.data ?? []).map((c) => [c.id, c.name]),
  );
  const gameInfoById = new Map(
    (joinGamesRes.data ?? []).map((g) => [
      g.id,
      { slug: g.slug, name_ko: g.name_ko },
    ]),
  );

  const hydratedJoinRows: JoinRow[] = (rawJoinFlat ?? []).map((r) => {
    const clanName = clanNameById.get(r.clan_id);
    const gameMeta = gameInfoById.get(r.game_id);
    return {
      id: r.id,
      status: r.status as JoinRow["status"],
      applied_at: r.applied_at,
      resolved_at: r.resolved_at,
      reject_reason: r.reject_reason,
      message: r.message ?? "",
      clans: clanName ? { name: clanName } : null,
      games: gameMeta ?? null,
    };
  });

  const pendingForBanner = hydratedJoinRows.filter((r) => r.status === "pending");

  const joinRequests: JoinRow[] = hydratedJoinRows.filter((r) => {
    if (r.status === "pending") return true;
    if (r.status !== "approved" && r.status !== "rejected") return false;
    if (!r.resolved_at) return false;
    return new Date(r.resolved_at) >= weekAgo;
  });

  if (joinClansRes.error) {
    console.error("[profile] join clans hydrate:", joinClansRes.error.message);
  }
  if (joinGamesRes.error) {
    console.error("[profile] join games hydrate:", joinGamesRes.error.message);
  }
  if (rawJoinFlatErr) {
    console.error("[profile] select_my_clan_join_requests:", rawJoinFlatErr.message);
  }

  const joinRequestsFetchFailed = Boolean(rawJoinFlatErr);
  const linkedGames: DecorationGame[] = (ugpRows ?? [])
    .map((r): DecorationGame | null => {
      const gRaw = r.games as
        | { id: string; slug: string; name_ko: string }
        | { id: string; slug: string; name_ko: string }[]
        | null;
      const g = Array.isArray(gRaw) ? gRaw[0] : gRaw;
      if (!g) return null;
      return { gameId: g.id, slug: g.slug, nameKo: g.name_ko, accountId: r.is_verified ? (g.slug === "overwatch" ? profileBattleTag(r) ?? undefined : r.riot_id ?? undefined) : undefined, linked: true };
    })
    .filter((x): x is DecorationGame => x !== null);

  const verifiedGameIds = [
    ...new Set(
      (ugpRows ?? [])
        .filter((r) => r.is_verified)
        .map((r) => r.game_id),
    ),
  ];

  const membershipRowsPromise = supabase
        .from("clan_members")
        .select("clan_id, role, clans(name, game_id, games(slug,name_ko))")
        .eq("user_id", user.id)
        .eq("status", "active");

  const { data: membershipRowsRaw } = await membershipRowsPromise;
  const membershipRows = membershipRowsRaw ?? [];

  const intro = typeof user.user_metadata?.profile_intro === "string" ? user.user_metadata.profile_intro.slice(0, 120) : "";
  const memberships: ProfileMembership[] = membershipRows.flatMap((membership) => {
    const clan = Array.isArray(membership.clans) ? membership.clans[0] : membership.clans;
    const game = Array.isArray(clan?.games) ? clan.games[0] : clan?.games;
    return game ? [{ clanId: membership.clan_id, clanName: clan.name, gameSlug: game.slug, gameName: game.name_ko, role: membership.role, accountId: linkedGames.find((linked) => linked.gameId === clan.game_id)?.accountId ?? null, altAccounts: (altRowsRaw ?? []).filter(alt => alt.game_id === clan.game_id).map(alt => alt.alt_nick), canManageAlts: verifiedGameIds.includes(clan.game_id) }] : [];
  });

  return <AccountShell context="프로필"><main className={styles.page}>
    <ProfilePanels overview={
      <div className={styles.profileHero} data-testid="profile-hero">
      <ProfileIdentity key={`identity:${user.id}`} userId={user.id} intro={intro} memberships={memberships} namecard={namecard}
        games={linkedGames.map((game) => ({ gameSlug: game.slug, gameName: game.nameKo, accountId: game.accountId, altAccounts: (altRowsRaw ?? []).filter(alt => alt.game_id === game.gameId).map(alt => alt.alt_nick), canManageAlts: verifiedGameIds.includes(game.gameId) }))}>
        {row && <section className={styles.identityFacts} aria-label="기본 정보"><dl>
          <div><dt>성별</dt><dd>{genderLabel(String(row.gender))}</dd></div>
          <div><dt>출생 연도</dt><dd>{row.birth_year ?? "미등록"}</dd></div>
          <div><dt>가입일</dt><dd>{row.created_at ? new Date(row.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "—"}</dd></div>
        </dl></section>}
      </ProfileIdentity>
    </div>
    } account={<div className={styles.accountLayout}>
      <div className={`${styles.accountColumn} ${styles.accountSettings}`}>
        {row ? <section className={`${styles.settingsAccount} ${styles.accountSection}`} aria-label="내 계정"><h2>내 계정</h2><dl className={styles.detailGrid}>
          <div><dt>이메일</dt><dd>{row.email || user.email}</dd></div>
          <div><dt>언어</dt><dd>{({ ko: "한국어", en: "English", ja: "日本語" } as Record<string, string>)[row.language] ?? row.language}</dd></div>
        </dl><ProfileAutoLogin key={user.id} initial={getSessionMaxAge((await cookies()).getAll()) === REMEMBERED_SESSION_SECONDS} /></section> : <p className={styles.error} role="alert">계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
        <div className={styles.accountActions}><form action={signOutAction}><Button type="submit" variant="outline" size="sm">로그아웃</Button></form><ProfileDeleteAccountButton /></div>

      </div>
      <div className={styles.accountColumn}>
        <ProfileGameDecorations games={(gameCatalog ?? []).map((game) => ({ gameId: game.id, slug: game.slug, nameKo: game.name_ko, isActive: game.is_active, ...linkedGames.find((linked) => linked.gameId === game.id) })).sort((a,b) => Number(b.linked ?? false) - Number(a.linked ?? false) || ["overwatch","valorant","lol","pubg"].indexOf(a.slug) - ["overwatch","valorant","lol","pubg"].indexOf(b.slug))} userId={user.id} memberships={memberships} preferences={rolePreferences ?? []} verifiedGameIds={verifiedGameIds} />
        <div className={styles.clanManagement}>
    {pendingForBanner.length > 0 && !joinRequestsFetchFailed ? <section className={styles.pendingBanner} aria-label="진행 중인 가입 신청 요약">
      <strong>진행 중인 가입 신청 {pendingForBanner.length}건</strong>
      {pendingForBanner.map((request) => <p key={request.id}>「{request.clans?.name ?? "클랜"}」 ({request.games?.name_ko ?? "게임"}) · 검토 중</p>)}
    </section> : null}

          <ProfileJoinRequests rows={joinRequests} loadFailed={joinRequestsFetchFailed} />
        </div>
      </div>
    </div>} />
  </main></AccountShell>;
}
