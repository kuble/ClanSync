"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { linkGameAccountDevSubmitAction, type LinkGameDevFormState } from "@/app/actions/game-clan-onboarding";
import { saveGameIdentityAction } from "@/app/actions/game-identity";
import { Button } from "@/components/ui/button";
import styles from "./onboarding.module.css";

const initial: LinkGameDevFormState = { error: null };

function SubmitButton({ ctaLabel, disabled }: { ctaLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" size="lg" disabled={disabled || pending}>{pending ? "연동 중…" : ctaLabel}</Button>;
}

export function GameAuthConnect({ gameSlug, ctaLabel, oauthReady, devSimulatorAvailable, nextPath, initialBattleTag = "", initialRiotId = "" }: {
  gameSlug: string; ctaLabel: string; oauthReady: boolean; devSimulatorAvailable: boolean; nextPath?: string; initialBattleTag?: string; initialRiotId?: string;
}) {
  const [state, formAction] = useActionState(linkGameAccountDevSubmitAction, initial);
  return <div className="space-y-5">
    {(gameSlug === "overwatch" || gameSlug === "valorant") && <ManualGameIdentityForm key={gameSlug} gameSlug={gameSlug} nextPath={nextPath} initialIdentity={gameSlug === "overwatch" ? initialBattleTag : initialRiotId} />}
    <form action={formAction} className="space-y-3 border-t pt-4">
    <input type="hidden" name="gameSlug" value={gameSlug} />
    <input type="hidden" name="nextPath" value={nextPath ?? ""} />
    {gameSlug === "overwatch" && devSimulatorAvailable && oauthReady && <label className="block space-y-2 text-left text-sm font-medium">
      <span>테스트 배틀태그</span>
      <input name="battleTag" aria-label="테스트 배틀태그" defaultValue={initialBattleTag} required maxLength={31} autoComplete="off" placeholder="AimZero#12345" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" aria-describedby="battle-tag-hint" />
      <span id="battle-tag-hint" className="block text-xs font-normal leading-relaxed text-muted-foreground">이름은 닉네임으로, #번호는 같은 이름의 계정을 구분할 때 사용합니다.</span>
    </label>}
    {gameSlug === "valorant" && devSimulatorAvailable && oauthReady && <label className="block space-y-2 text-left text-sm font-medium"><span>테스트 라이엇 ID</span><input name="riotId" aria-label="테스트 라이엇 ID" defaultValue={initialRiotId} required maxLength={22} autoComplete="off" placeholder="Player#KR1" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" /><span className="block text-xs font-normal leading-relaxed text-muted-foreground">게임 이름과 #태그를 모두 입력해 주십시오.</span></label>}
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    <SubmitButton ctaLabel={devSimulatorAvailable && oauthReady ? gameSlug === "overwatch" ? "테스트 배틀태그로 연결" : ctaLabel : "계정 연동 준비 중"} disabled={!oauthReady || !devSimulatorAvailable} />
    </form>
  </div>;
}

function ManualGameIdentityForm({ gameSlug, nextPath, initialIdentity }: { gameSlug: string; nextPath?: string; initialIdentity: string }) {
  const [state, action, pending] = useActionState(saveGameIdentityAction, initial);
  const [identity, setIdentity] = useState(initialIdentity);
  const label = gameSlug === "overwatch" ? "배틀태그" : "라이엇 ID";
  return <form action={action} className="space-y-3 text-left">
    <input type="hidden" name="gameSlug" value={gameSlug} />
    <input type="hidden" name="nextPath" value={nextPath ?? ""} />
    <label className="block space-y-2 text-sm font-medium"><span>{label} 직접 입력</span><input name="identity" aria-label={`${label} 직접 입력`} value={identity} onChange={event => setIdentity(event.target.value)} required maxLength={gameSlug === "overwatch" ? 31 : 22} autoComplete="off" placeholder={gameSlug === "overwatch" ? "AimZero#12345" : "Player#KR1"} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" aria-describedby="manual-identity-hint" /></label>
    <p id="manual-identity-hint" className="text-xs leading-relaxed text-muted-foreground">직접 입력한 ID는 미인증으로 표시되며 클랜 가입과 활동에 사용할 수 있습니다. 인증된 ID를 수정하면 인증이 해제됩니다.</p>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "저장 중…" : "게임 ID 저장"}</Button>
  </form>;
}
