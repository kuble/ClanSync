"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClanEventAction } from "@/app/actions/clan-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const WD_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

export function CreateClanEventForm({
  gameSlug,
  clanId,
}: {
  gameSlug: string;
  clanId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [repeatMode, setRepeatMode] = useState<"none" | "weekly" | "monthly">(
    "none",
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const local = String(fd.get("start_at_local") ?? "");
    if (local) {
      const d = new Date(local);
      if (!Number.isNaN(d.getTime())) {
        fd.set("start_at", d.toISOString());
      }
    }
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
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card space-y-4 rounded-xl border p-4 shadow-sm"
    >
      <h3 className="text-sm font-medium">일정 추가</h3>
      <div className="space-y-2">
        <Label htmlFor="evt-title">제목</Label>
        <Input id="evt-title" name="title" required maxLength={120} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="evt-kind">유형</Label>
        <select
          id="evt-kind"
          name="kind"
          className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-2 text-sm"
          defaultValue="event"
        >
          <option value="intra">내전</option>
          <option value="event">이벤트</option>
        </select>
        <p className="text-muted-foreground text-xs">
          스크림 일정은 매칭 확정 시 자동 등록됩니다 (D-EVENTS-01).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="evt-repeat">반복</Label>
        <select
          id="evt-repeat"
          value={repeatMode}
          onChange={(ev) =>
            setRepeatMode(ev.target.value as "none" | "weekly" | "monthly")
          }
          className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-2 text-sm"
        >
          <option value="none">없음 (일회)</option>
          <option value="weekly">매주</option>
          <option value="monthly">매월 (시작 날짜의 일자)</option>
        </select>
        <p className="text-muted-foreground text-xs">
          매주·매월 반복 시 시각은 아래 &quot;시작&quot; 필드 시각과 동일하게
          적용됩니다 (D-EVENTS-02).
        </p>
      </div>
      {repeatMode === "weekly" ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground text-xs font-medium">
            반복 요일 (1개 이상)
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
      <div className="space-y-2">
        <Label htmlFor="evt-start">시작 (로컬 시각)</Label>
        <Input
          id="evt-start"
          name="start_at_local"
          type="datetime-local"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="evt-place">장소·메모 (선택)</Label>
        <Input id="evt-place" name="place" maxLength={500} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "등록"}
      </Button>
    </form>
  );
}
