"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createClanEventAction } from "@/app/actions/clan-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClanEventForm({
  gameSlug,
  clanId,
}: {
  gameSlug: string;
  clanId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

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
    start(async () => {
      const r = await createClanEventAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("일정을 추가했습니다.");
      form.reset();
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
          <option value="scrim">스크림</option>
          <option value="event">이벤트</option>
        </select>
      </div>
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
