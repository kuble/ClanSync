"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { linkGameAccountDevAction } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";

function safePostAuthPath(gameSlug: string, next: string | undefined): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return `/games/${encodeURIComponent(gameSlug)}/clan`;
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
          // refresh+push 조합은 미들웨어가 아직 미검증 상태를 보고 /auth 로 되돌리는 경합이 난다.
          // 전체 로드로 DB 반영 후 D-AUTH-01 다음 단계를 확실히 밟는다.
          window.location.assign(safePostAuthPath(gameSlug, nextPath));
        })
      }
    >
      {pending ? "연동 중…" : ctaLabel}
    </Button>
  );
}
