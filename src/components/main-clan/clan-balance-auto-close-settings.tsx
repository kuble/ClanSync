"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import { updateBalanceAutoCloseSettingsAction } from "@/app/actions/clan-balance-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ClanBalanceAutoCloseSettings({
  gameSlug,
  clanId,
  initialEnabled,
  initialHours,
}: {
  gameSlug: string;
  clanId: string;
  initialEnabled: boolean;
  initialHours: number;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hours = Number(formData.get("hours"));
    startTransition(async () => {
      const result = await updateBalanceAutoCloseSettingsAction(
        gameSlug,
        clanId,
        enabled,
        hours,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("자동 종료 설정을 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock3 className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-bold">세션 자동 종료</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            마지막 편성·투표·예측 입력 후 설정한 시간 동안 활동이 없으면 진행
            중인 세션을 종료합니다.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <Label htmlFor="balance-auto-close-toggle">자동 종료 사용</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              새 클랜은 기본 3시간으로 사용합니다.
            </p>
          </div>
          <button
            id="balance-auto-close-toggle"
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((value) => !value)}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              enabled
                ? "border-primary bg-primary"
                : "border-input bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
                enabled ? "translate-x-5" : "translate-x-0",
              )}
            />
            <span className="sr-only">{enabled ? "사용 중" : "사용 안 함"}</span>
          </button>
        </div>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="balance-auto-close-hours">활동이 없을 때</Label>
          <div className="flex items-center gap-2">
            <Input
              id="balance-auto-close-hours"
              name="hours"
              type="number"
              min={1}
              max={168}
              step={1}
              placeholder="1~168시간"
              defaultValue={initialHours}
              required
              className="w-24 tabular-nums"
            />
            <span className="text-sm text-muted-foreground">시간 후 종료</span>
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "설정 저장"}
        </Button>
      </form>
    </section>
  );
}
