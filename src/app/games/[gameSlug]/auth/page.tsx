import Link from "next/link";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { ArrowLeft, Gamepad2, Info, ShieldCheck } from "lucide-react";
import { AccountShell, OnboardingSteps } from "@/components/onboarding/account-shell";
import { GameAuthConnect } from "@/components/onboarding/game-auth-connect";
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
    <OnboardingSteps current={2} />
    {cfg ? <>
      {reauth ? <p className={`${styles.notice} ${styles.warning}`}>게임 ID를 등록하거나 수정할 수 있습니다. 게임 ID를 저장하면 원래 보던 화면으로 돌아갑니다.</p> : null}
      <section className={styles.authCard}>
        <div className={styles.gameIcon}><Gamepad2 size={36} aria-hidden="true" /></div>
        <h1 className={styles.heading}>{cfg.title.replace("계정 연동", "게임 ID 등록")}</h1>
        <p className={styles.description}>{gameSlug === "overwatch" ? <>배틀태그 이름으로 클랜에 참여합니다.<br />전체 배틀태그를 입력하면 미인증 상태로도 이용할 수 있습니다.</> : <>게임 계정을 연결하면 클랜에 가입하거나<br />새 클랜을 만들 수 있습니다.</>}</p>
        <div className={styles.provider}>
          <div className={styles.providerHeader}><ShieldCheck size={28} aria-hidden="true" /><div><h2>{cfg.providerLabel} 계정</h2><p>{devSimulator && cfg.oauthReady ? "테스트 계정 연결" : "현재 이 게임의 신규 계정 연동은 제공되지 않습니다."}</p></div></div>
          <GameAuthConnect gameSlug={gameSlug} ctaLabel={cfg.ctaLabel} oauthReady={cfg.oauthReady} devSimulatorAvailable={devSimulator} nextPath={nextPath} initialBattleTag={initialBattleTag} initialRiotId={initialRiotId} />
        </div>
        <p className={styles.notice}><Info size={16} aria-hidden="true" /><span>{devSimulator && cfg.oauthReady ? "QA 환경에서는 테스트 계정으로 연동 흐름을 확인할 수 있습니다." : "이미 연결된 계정은 게임 선택에서 클랜으로 이동할 수 있습니다. 신규 연동이 가능해지면 이 화면에서 안내합니다."}</span></p>
      </section>
    </> : <section className={styles.authCard}><h1 className={styles.heading}>지원하지 않는 게임</h1><p className={styles.description}>게임 선택에서 이용 가능한 게임을 확인해 주십시오.</p></section>}
    <Link href={nextPath ?? "/games"} className={styles.back}><ArrowLeft size={15} aria-hidden="true" />돌아가기</Link>
  </main></AccountShell>;
}
