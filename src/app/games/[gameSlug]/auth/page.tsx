import Link from "next/link";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { ArrowLeft } from "lucide-react";
import { AccountShell } from "@/components/onboarding/account-shell";
import { GameAuthConnect } from "@/components/onboarding/game-auth-connect";
import { GameLogo } from "@/components/ui/game-logo";
import { getGameAuthConfig } from "@/lib/game-auth/game-auth-config";
import { allowDevGameLink } from "@/lib/auth/allow-dev-game-link";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { profileBattleTag } from "@/lib/game-auth/battle-tag";
import styles from "@/components/onboarding/onboarding.module.css";

export const metadata = { title: "게임 ID 등록 · ClanSync" };

export default async function GameAuthPage({ params, searchParams }: {
  params: Promise<{ gameSlug: string }>; searchParams: Promise<{ reauth?: string; next?: string }>;
}) {
  const [{ gameSlug }, { reauth, next }] = await Promise.all([params, searchParams]);
  const cfg = getGameAuthConfig(gameSlug);
  const devSimulator = allowDevGameLink(process.env);
  const nextPath = safeNextPath(next, "") || undefined;
  const cancelPath = nextPath && /^\/profile(?:[?#]|$)/.test(nextPath) ? nextPath : "/games";
  const canRegister = gameSlug === "overwatch" || gameSlug === "valorant";
  const gameName = cfg?.title.replace(" 계정 연동", "") ?? "";
  let initialBattleTag = "";
  let initialRiotId = "";
  if (gameSlug === "overwatch" || gameSlug === "valorant") {
    const user = await getRequestUser();
    if (user) {
      const client = await getRequestClient();
      const { data } = await client.from("user_game_profiles").select("battle_tag,riot_id,game_uid,games!inner(slug)")
        .eq("user_id", user.id).eq("games.slug", gameSlug).maybeSingle();
      initialBattleTag = profileBattleTag(data ?? undefined) ?? "";
      initialRiotId = data?.riot_id ?? "";
    }
  }
  return <AccountShell><main className={`${styles.content} ${styles.authContent}`}>
    {cfg ? <>
      <section className={styles.authCard}>
        <div className={styles.gameIcon} aria-hidden="true"><GameLogo slug={gameSlug} name={gameName} className="size-7" /></div>
        <h1 className={styles.heading}>{gameName} 게임 ID {reauth ? "수정" : "등록"}</h1>
        <p className={styles.description}>{canRegister ? `클랜에서 사용할 ${gameSlug === "overwatch" ? "배틀태그" : "라이엇 ID"}를 ${reauth ? "수정" : "등록"}합니다.` : "이 게임의 ID 등록은 준비 중입니다."}</p>
        {canRegister && <GameAuthConnect gameSlug={gameSlug} oauthReady={cfg.oauthReady} devSimulatorAvailable={devSimulator} nextPath={nextPath} initialBattleTag={initialBattleTag} initialRiotId={initialRiotId} />}
      </section>
    </> : <section className={styles.authCard}><h1 className={styles.heading}>지원하지 않는 게임</h1><p className={styles.description}>게임 선택에서 이용 가능한 게임을 확인해 주십시오.</p></section>}
    <Link href={cancelPath} className={styles.back}><ArrowLeft size={15} aria-hidden="true" />{cancelPath === "/games" ? "게임 선택으로" : "프로필로 돌아가기"}</Link>
  </main></AccountShell>;
}
