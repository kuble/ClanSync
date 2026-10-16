"use client";

import { CalendarClock, Clock3 } from "lucide-react";
import { updateBalanceAutoCloseSettingsAction, updateBalanceAutoOpenSettingsAction } from "@/app/actions/clan-balance-settings";
import { useAutosave, AutosaveStatus } from "@/components/ui/use-autosave";
import { HelpText } from "./help-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ClanBalanceAutoCloseSettings({ gameSlug, clanId, initialEnabled, initialHours, initialOpenEnabled, initialOpenMinutes }: {
  gameSlug: string; clanId: string; initialEnabled: boolean; initialHours: number; initialOpenEnabled: boolean; initialOpenMinutes: number;
}) {
  const closeSave = useAutosave({ enabled: initialEnabled, hours: String(initialHours) }, async (draft) => {
    const hours = Number(draft.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) return { ok: false, error: "자동 종료 시간은 1~168시간 사이의 정수로 입력해 주세요." };
    return updateBalanceAutoCloseSettingsAction(gameSlug, clanId, draft.enabled, hours);
  });
  const openSave = useAutosave({ enabled: initialOpenEnabled, minutes: String(initialOpenMinutes) }, async (draft) => {
    const minutes = Number(draft.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return { ok: false, error: "자동 생성 시점은 1~1440분 사이의 정수로 입력해 주세요." };
    return updateBalanceAutoOpenSettingsAction(gameSlug, clanId, draft.enabled, minutes);
  });
  const saves = [openSave, closeSave];
  const failures = saves.filter(save => save.status === "error");
  const status = failures.length ? "error" : saves.some(save => save.status === "saving") ? "saving" : saves.some(save => save.status === "saved") ? "saved" : "idle";

  return <div className="space-y-4" data-testid="balance-automation-settings">
    <section className="overflow-hidden rounded-xl border border-border bg-card" data-testid="balance-auto-open-settings">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarClock className="size-4" aria-hidden /></span>
          <h3 className="text-[13px] font-semibold"><HelpText label="예약된 내전 자동 생성" help="예약 시각보다 설정한 분만큼 먼저 내전을 열어 입장할 수 있게 합니다. 끄면 운영진이나 호스트가 직접 열어야 합니다." /></h3>
        </div>
        <button type="button" role="switch" aria-label="예약된 내전 자동 생성" aria-checked={openSave.value.enabled} aria-controls="balance-auto-open-details"
          onClick={() => openSave.update(current => ({ ...current, enabled: !current.enabled }))}
          className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", openSave.value.enabled ? "border-primary bg-primary" : "border-input bg-muted")}>
          <span aria-hidden className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", openSave.value.enabled ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>
      {openSave.value.enabled && <div id="balance-auto-open-details" className="mx-5 mb-5 border-l-2 border-primary/25 pl-4 sm:pl-5">
        <div className="max-w-xs space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
          <Label htmlFor="balance-auto-open-minutes">예약 시각</Label>
          <div className="flex items-center gap-2"><Input id="balance-auto-open-minutes" type="number" min={1} max={1440} step={1} value={openSave.value.minutes} required
            onChange={event => openSave.update(current => ({ ...current, minutes: event.target.value }))} className="w-24 tabular-nums" /><span className="text-sm text-muted-foreground">분 전 생성</span></div>
        </div>
      </div>}
    </section>
    <section className="overflow-hidden rounded-xl border border-border bg-card" data-testid="balance-auto-close-settings">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock3 className="size-4" aria-hidden /></span>
          <h3 className="text-[13px] font-semibold"><HelpText label="내전 자동 종료" help="마지막 편성·투표·예측 입력 후 설정한 시간 동안 활동이 없으면 진행 중인 내전을 종료합니다." /></h3>
        </div>
        <button id="balance-auto-close-toggle" type="button" role="switch" aria-label="내전 자동 종료" aria-checked={closeSave.value.enabled} aria-controls="balance-auto-close-details"
          onClick={() => closeSave.update(current => ({ ...current, enabled: !current.enabled }))}
          className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", closeSave.value.enabled ? "border-primary bg-primary" : "border-input bg-muted")}>
          <span aria-hidden className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", closeSave.value.enabled ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>
      {closeSave.value.enabled && <div id="balance-auto-close-details" className="mx-5 mb-5 border-l-2 border-primary/25 pl-4 sm:pl-5">
        <div className="max-w-xs space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
          <Label htmlFor="balance-auto-close-hours">활동이 없을 때</Label>
          <div className="flex items-center gap-2"><Input id="balance-auto-close-hours" name="hours" type="number" min={1} max={168} step={1} placeholder="1~168시간" value={closeSave.value.hours} required
            onChange={event => closeSave.update(current => ({ ...current, hours: event.target.value }))} className="w-24 tabular-nums" /><span className="text-sm text-muted-foreground">시간 후 종료</span></div>
        </div>
      </div>}
    </section>
    <AutosaveStatus status={status} error={[...new Set(failures.map(save => save.error))].join(" ")} retry={() => { for (const save of failures) void save.retry(); }} />
  </div>;
}
