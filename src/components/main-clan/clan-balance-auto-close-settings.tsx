"use client";

import { Clock3 } from "lucide-react";
import { updateBalanceAutoCloseSettingsAction } from "@/app/actions/clan-balance-settings";
import { useAutosave, AutosaveStatus } from "@/components/ui/use-autosave";
import { HelpText } from "./help-text";
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
  const autosave = useAutosave({ enabled: initialEnabled, hours: String(initialHours) }, async (draft) => {
    const hours = Number(draft.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) return { ok: false, error: "자동 종료 시간은 1~168시간 사이의 정수로 입력해 주세요." };
    return updateBalanceAutoCloseSettingsAction(gameSlug, clanId, draft.enabled, hours);
  });
  const { enabled, hours } = autosave.value;

  return (
    <div className="space-y-4">
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock3 className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-bold"><HelpText label="세션 자동 종료" help="마지막 편성·투표·예측 입력 후 설정한 시간 동안 활동이 없으면 진행 중인 세션을 종료합니다. 새 클랜은 기본 3시간으로 사용합니다." /></h3>
        </div>
        </div>
          <button
            id="balance-auto-close-toggle"
            type="button"
            role="switch"
            aria-label="세션 자동 종료"
            aria-checked={enabled}
            aria-controls="balance-auto-close-details"
            onClick={() => autosave.update((current) => ({ ...current, enabled: !current.enabled }))}
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
          </button>
      </div>

      <form onSubmit={(event) => event.preventDefault()} className="mt-5 space-y-5">

        <div id="balance-auto-close-details" hidden={!enabled} className="ml-4 border-l-2 border-primary/25 pl-4 sm:pl-5">
        <div className="max-w-xs space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
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
              value={hours}
              onChange={(event) => autosave.update((current) => ({ ...current, hours: event.target.value }))}
              required
              className="w-24 tabular-nums"
            />
            <span className="text-sm text-muted-foreground">시간 후 종료</span>
          </div>
        </div>
        </div>

      </form>
    </section>
    <AutosaveStatus {...autosave} />
    </div>
  );
}
