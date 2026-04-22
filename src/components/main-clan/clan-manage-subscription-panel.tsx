"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { toggleClanPlanDevFormAction } from "@/app/actions/main-clan-shell";
import { Button } from "@/components/ui/button";

export function ClanManageSubscriptionPanel({
  gameSlug,
  clanId,
  tierLabel,
  showDevPlanToggle,
  isLeader,
}: {
  gameSlug: string;
  clanId: string;
  tierLabel: string;
  showDevPlanToggle: boolean;
  isLeader: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const togglePlan = toggleClanPlanDevFormAction.bind(
    null,
    gameSlug,
    clanId,
  );

  function onToggle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await togglePlan(fd);
        toast.success("플랜을 전환했습니다.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "플랜 전환에 실패했습니다.",
        );
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <h3 className="text-sm font-medium tracking-tight">구독·플랜</h3>
      <p className="text-sm">
        현재 플랜: <span className="font-medium">{tierLabel}</span>
      </p>
      <p className="text-muted-foreground text-xs">
        실결제·청구 연동은 후속 단계입니다. Premium 전용 스토어 항목은 플랜에
        따라 잠깁니다.
      </p>
      {showDevPlanToggle && isLeader ? (
        <form onSubmit={onToggle} className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            개발용 Free ↔ Premium 전환
          </Button>
          <span className="text-muted-foreground text-xs">
            NODE_ENV=development 또는 DEV_CLAN_PLAN_TOGGLE=1 일 때만 동작합니다.
          </span>
        </form>
      ) : null}
    </section>
  );
}
