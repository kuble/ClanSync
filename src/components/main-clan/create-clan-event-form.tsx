"use client";

import { useTranslator } from "#use-translator";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClanEventAction } from "@/app/actions/clan-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EventDiscordFields } from "./event-discord-fields";
import { BalanceSchedulePicker } from "./balance-schedule-picker";
const WD_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

export function CreateClanEventForm({
  gameSlug,
  clanId,
  defaultDate,
  onCreated,
  discordAvailable = false,
  discordChannelName,
}: {
  gameSlug: string;
  clanId: string;
  defaultDate: string;
  onCreated?: () => void;
  discordAvailable?: boolean;
  discordChannelName?: string | null;
}) {
  const tx = useTranslator();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [startAt, setStartAt] = useState(`${defaultDate}T20:00`);
  const [repeatMode, setRepeatMode] = useState<"none" | "weekly" | "monthly">(
    "none",
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("start_at", new Date(`${startAt}:00+09:00`).toISOString());
    fd.set("repeat", repeatMode);
    start(async () => {
      const r = await createClanEventAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("일정을 추가했습니다.");
      form.reset();
      setRepeatMode("none");
      onCreated?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <fieldset disabled={pending} className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
      <div className="space-y-2">
        <Label htmlFor="evt-title">{tx("제목")}</Label>
        <Input id="evt-title" name="title" required maxLength={120} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="evt-kind">{tx("유형")}</Label>
        <select
          id="evt-kind"
          name="kind"
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          defaultValue="event"
        >
          <option value="intra">{tx("내전")}</option>
          <option value="event">{tx("이벤트")}</option>
        </select>
        <p className="text-muted-foreground text-xs">
          {tx("스크림 일정은 매칭 확정 시 자동 등록됩니다.")}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="evt-repeat">{tx("반복")}</Label>
        <select
          id="evt-repeat"
          value={repeatMode}
          onChange={(ev) =>
            setRepeatMode(ev.target.value as "none" | "weekly" | "monthly")
          }
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="none">{tx("없음 (일회)")}</option>
          <option value="weekly">{tx("매주")}</option>
          <option value="monthly">{tx("매월 (시작 날짜의 일자)")}</option>
        </select>
        <p className="text-muted-foreground text-xs">
          {tx("매주·매월 반복 시 시각은 아래 \"시작\" 필드 시각과 동일하게 적용됩니다.")}
        </p>
      </div>
      {repeatMode === "weekly" ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground text-xs font-medium">
            {tx("반복 요일 (1개 이상)")}
          </p>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((iso) => (
              <label
                key={iso}
                className="flex cursor-pointer items-center gap-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  name="repeat_weekday"
                  value={String(iso)}
                />
                {WD_LABEL[iso - 1]}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <BalanceSchedulePicker disabled={pending} value={startAt} onChange={setStartAt} serverNow={Date.parse(`${defaultDate}T00:00:00+09:00`)} label={tx("시작 날짜·시각")} />
      <div className="space-y-2">
        <Label htmlFor="evt-place">{tx("장소·메모 (선택)")}</Label>
        <Input id="evt-place" name="place" maxLength={500} />
      </div>
      <EventDiscordFields available={discordAvailable} channelName={discordChannelName} settingsHref={`/games/${gameSlug}/clan/${clanId}/manage?tab=notifications`} />
      </fieldset>
      <div className="shrink-0 border-t px-5 py-4">
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? tx("저장 중…") : tx("등록")}
      </Button>
      </div>
    </form>
  );
}
