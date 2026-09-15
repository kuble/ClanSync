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
      } catch {
        toast.error(
          "플랜을 전환하지 못했습니다. 잠시 후 다시 시도해 주세요.",
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
        유료 구독 결제는 준비 중입니다. Premium 전용 상품과 기능은 Premium
        클랜에서 이용할 수 있습니다.
      </p>
      {showDevPlanToggle && isLeader ? (
        <form onSubmit={onToggle} className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            테스트 플랜 전환
          </Button>
          <span className="text-muted-foreground text-xs">
            테스트용 Free / Premium 전환입니다. 실제 결제는 발생하지 않습니다.
          </span>
        </form>
      ) : null}
    </section>
  );
}
