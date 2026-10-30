"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, ChevronDown, Info } from "lucide-react";
import { linkGameAccountDevSubmitAction, type LinkGameDevFormState } from "@/app/actions/game-clan-onboarding";
import { saveGameIdentityAction } from "@/app/actions/game-identity";
import { Button } from "@/components/ui/button";
import styles from "./onboarding.module.css";
import formStyles from "@/components/entry/auth.module.css";

const initial: LinkGameDevFormState = { error: null };

function SubmitButton({ ctaLabel }: { ctaLabel: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "연동 중…" : ctaLabel}</Button>;
}

export function GameAuthConnect({ gameSlug, oauthReady, devSimulatorAvailable, nextPath, initialBattleTag = "", initialRiotId = "" }: {
  gameSlug: string; oauthReady: boolean; devSimulatorAvailable: boolean; nextPath?: string; initialBattleTag?: string; initialRiotId?: string;
}) {
  const [state, formAction] = useActionState(linkGameAccountDevSubmitAction, initial);
  return <div className={styles.identityForms}>
    {(gameSlug === "overwatch" || gameSlug === "valorant") && <ManualGameIdentityForm key={gameSlug} gameSlug={gameSlug} nextPath={nextPath} initialIdentity={gameSlug === "overwatch" ? initialBattleTag : initialRiotId} />}
    {devSimulatorAvailable && oauthReady && <details className={styles.qaTools}>
      <summary>개발용 연결 테스트<ChevronDown size={14} aria-hidden="true" /></summary>
      <p>실제 Battle.net·Riot 인증이 아닌 QA용 연결입니다.</p>
    <form action={formAction} className="space-y-3">
    <input type="hidden" name="gameSlug" value={gameSlug} />
    <input type="hidden" name="nextPath" value={nextPath ?? ""} />
    {gameSlug === "overwatch" && devSimulatorAvailable && oauthReady && <label className="block space-y-2 text-left text-sm font-medium">
      <span>테스트 배틀태그</span>
      <input name="battleTag" aria-label="테스트 배틀태그" defaultValue={initialBattleTag} required maxLength={31} autoComplete="off" placeholder="AimZero#12345" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" aria-describedby="battle-tag-hint" />
      <span id="battle-tag-hint" className="block text-xs font-normal leading-relaxed text-muted-foreground">이름은 닉네임으로, #번호는 같은 이름의 계정을 구분할 때 사용합니다.</span>
    </label>}
    {gameSlug === "valorant" && devSimulatorAvailable && oauthReady && <label className="block space-y-2 text-left text-sm font-medium"><span>테스트 라이엇 ID</span><input name="riotId" aria-label="테스트 라이엇 ID" defaultValue={initialRiotId} required maxLength={22} autoComplete="off" placeholder="Player#KR1" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" /><span className="block text-xs font-normal leading-relaxed text-muted-foreground">게임 이름과 #태그를 모두 입력해 주십시오.</span></label>}
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    <SubmitButton ctaLabel={gameSlug === "overwatch" ? "테스트 배틀태그로 연결" : "테스트 라이엇 ID로 연결"} />
    </form>
    </details>}
  </div>;
}

function ManualGameIdentityForm({ gameSlug, nextPath, initialIdentity }: { gameSlug: string; nextPath?: string; initialIdentity: string }) {
  const [state, action, pending] = useActionState(saveGameIdentityAction, initial);
  const [identity, setIdentity] = useState(initialIdentity);
  const label = gameSlug === "overwatch" ? "배틀태그" : "라이엇 ID";
  return <form action={action} className={formStyles.form}>
    <input type="hidden" name="gameSlug" value={gameSlug} />
    <input type="hidden" name="nextPath" value={nextPath ?? ""} />
    <div className={formStyles.field}>
      <label htmlFor="game-identity">{label} 직접 입력</label>
      <input id="game-identity" name="identity" value={identity} onChange={event => setIdentity(event.target.value)} required maxLength={gameSlug === "overwatch" ? 31 : 22} autoComplete="off" spellCheck={false} placeholder={gameSlug === "overwatch" ? "AimZero#12345" : "Player#KR1"} aria-describedby="manual-identity-hint" aria-invalid={state.error ? true : undefined} />
      <p id="manual-identity-hint" className={formStyles.inputHint}>{gameSlug === "overwatch" ? "이름과 #번호를 함께 입력합니다." : "게임 이름과 #태그를 함께 입력합니다."}</p>
    </div>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    <button type="submit" className={formStyles.submit} disabled={pending}>{pending ? "저장 중…" : "게임 ID 저장"}<ArrowRight size={17} aria-hidden="true" /></button>
    <p className={styles.identityNote}><Info size={15} aria-hidden="true" /><span>직접 등록한 ID는 미인증 상태로 표시되며 클랜 활동에 사용할 수 있습니다.{initialIdentity && <> 인증된 ID를 변경하면 인증이 해제됩니다.</>}</span></p>
  </form>;
}
