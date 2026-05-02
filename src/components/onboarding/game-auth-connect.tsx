"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  linkGameAccountDevSubmitAction,
  type LinkGameDevFormState,
} from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";

const initial: LinkGameDevFormState = { error: null };

function SubmitButton({
  ctaLabel,
  disabled,
}: {
  ctaLabel: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full sm:w-auto"
      size="lg"
      disabled={disabled || pending}
    >
      {pending ? "연동 중…" : ctaLabel}
    </Button>
  );
}

export function GameAuthConnect({
  gameSlug,
  ctaLabel,
  oauthReady,
  devSimulatorAvailable,
  nextPath,
}: {
  gameSlug: string;
  ctaLabel: string;
  oauthReady: boolean;
  devSimulatorAvailable: boolean;
  /** 미들웨어가 붙인 `?next=` — 시뮬레이터 성공 시 우선 이동 */
  nextPath?: string;
}) {
  const [state, formAction] = useFormState(
    linkGameAccountDevSubmitAction,
    initial,
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  const disabled = !oauthReady || !devSimulatorAvailable;

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="gameSlug" value={gameSlug} />
      <input type="hidden" name="nextPath" value={nextPath ?? ""} />
      <SubmitButton ctaLabel={ctaLabel} disabled={disabled} />
    </form>
  );
}
