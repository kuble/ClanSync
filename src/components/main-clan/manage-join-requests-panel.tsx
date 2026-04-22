"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveClanJoinRequestAction,
  rejectClanJoinRequestAction,
} from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ManageJoinRequestRow = {
  id: string;
  message: string;
  appliedAt: string;
  nickname: string;
  email: string;
};

export function ManageJoinRequestsPanel({
  gameSlug,
  clanId,
  rows,
}: {
  gameSlug: string;
  clanId: string;
  rows: ManageJoinRequestRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function approve(id: string) {
    start(async () => {
      const r = await approveClanJoinRequestAction(gameSlug, clanId, id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("가입을 승인했습니다.");
      router.refresh();
    });
  }

  function submitReject(id: string) {
    start(async () => {
      const r = await rejectClanJoinRequestAction(
        gameSlug,
        clanId,
        id,
        rejectReason,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("신청을 거절했습니다.");
      setRejectId(null);
      setRejectReason("");
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        대기 중인 가입 신청이 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li
          key={row.id}
          className="bg-card rounded-xl border p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {row.nickname}
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {row.email}
                </span>
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                신청일{" "}
                {new Date(row.appliedAt).toLocaleString("ko-KR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {row.message ? (
                <p className="text-muted-foreground mt-2 border-l-2 pl-3 text-sm">
                  {row.message}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => approve(row.id)}
              >
                승인
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  setRejectId((v) => (v === row.id ? null : row.id))
                }
              >
                거절
              </Button>
            </div>
          </div>
          {rejectId === row.id ? (
            <div className="mt-4 space-y-2 border-t pt-4">
              <Label htmlFor={`reject-${row.id}`}>거절 사유 (선택)</Label>
              <Input
                id={`reject-${row.id}`}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="신청자에게 전달할 짧은 사유"
                maxLength={500}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => submitReject(row.id)}
                >
                  거절 확정
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRejectId(null);
                    setRejectReason("");
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
