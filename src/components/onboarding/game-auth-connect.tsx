"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { linkGameAccountDevSubmitAction, type LinkGameDevFormState } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";
import styles from "./onboarding.module.css";

const initial: LinkGameDevFormState = { error: null };

function SubmitButton({ ctaLabel, disabled }: { ctaLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" size="lg" disabled={disabled || pending}>{pending ? "연동 중…" : ctaLabel}</Button>;
}

export function GameAuthConnect({ gameSlug, ctaLabel, oauthReady, devSimulatorAvailable, nextPath }: {
  gameSlug: string; ctaLabel: string; oauthReady: boolean; devSimulatorAvailable: boolean; nextPath?: string;
}) {
  const [state, formAction] = useActionState(linkGameAccountDevSubmitAction, initial);
  return <form action={formAction} className="space-y-3">
    <input type="hidden" name="gameSlug" value={gameSlug} />
    <input type="hidden" name="nextPath" value={nextPath ?? ""} />
    {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
    <SubmitButton ctaLabel={devSimulatorAvailable && oauthReady ? ctaLabel : "계정 연동 준비 중"} disabled={!oauthReady || !devSimulatorAvailable} />
  </form>;
}
