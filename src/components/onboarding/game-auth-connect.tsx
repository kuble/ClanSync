"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { linkGameAccountDevAction } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";

export function GameAuthConnect({
  gameSlug,
  ctaLabel,
  oauthReady,
  devSimulatorAvailable,
}: {
  gameSlug: string;
  ctaLabel: string;
  oauthReady: boolean;
  devSimulatorAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const disabled = !oauthReady || !devSimulatorAvailable || pending;

  return (
    <Button
      type="button"
      className="w-full sm:w-auto"
      size="lg"
      disabled={disabled}
      onClick={() =>
        start(async () => {
          const r = await linkGameAccountDevAction(gameSlug);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success("게임 계정이 연동되었습니다.");
          router.refresh();
          router.push(`/games/${gameSlug}/clan`);
        })
      }
    >
      {pending ? "연동 중…" : ctaLabel}
    </Button>
  );
}
