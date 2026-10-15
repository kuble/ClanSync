"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  rejectClanJoinRequestAction,
} from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticipantRecordDialog } from "./participant-record-dialog";

const MANAGE_TOAST_DURATION_MS = 4800;
const MANAGE_REFRESH_DELAY_MS = 2600;

export type ManageJoinRequestRow = {
  id: string;
  message: string;
  appliedAt: string;
  nickname: string;
  userId: string;
  gameTag: string | null;
  gameVerified: boolean;
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
  const [busy, setBusy] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approving, setApproving] = useState<ManageJoinRequestRow | null>(null);

  async function submitReject(id: string) {
    setBusy(true);
    const tid = toast.loading("거절 처리 중…");
    try {
      const r = await rejectClanJoinRequestAction(
        gameSlug,
        clanId,
        id,
        rejectReason,
      );
      toast.dismiss(tid);
      if (!r.ok) {
        toast.error(r.error, { duration: 7000 });
        return;
      }
      toast.success("신청을 거절했습니다.", {
        duration: MANAGE_TOAST_DURATION_MS,
      });
      setRejectId(null);
      setRejectReason("");
      window.setTimeout(() => router.refresh(), MANAGE_REFRESH_DELAY_MS);
    } catch (e) {
      toast.dismiss(tid);
      console.error(e);
      toast.error(
        "신청을 거절하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        { duration: 7000 },
      );
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        대기 중인 가입 신청이 없습니다.
      </p>
    );
  }

  return (
    <><ul className="space-y-4">
      {rows.map((row) => (
        <li
          key={row.id}
          className="bg-card rounded-xl border p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="break-words font-semibold">{row.gameTag?.split("#")[0] ?? row.nickname}<span className="ml-1 text-sm font-normal text-muted-foreground">{row.gameTag?.includes("#") ? `#${row.gameTag.split("#")[1]}` : ""}</span></p>
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${row.gameVerified ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><ShieldCheck size={12} aria-hidden="true" />{row.gameVerified ? "게임 인증 완료" : "게임 미인증"}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                신청일{" "}
                {new Date(Date.parse(row.appliedAt) + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ")}
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
                disabled={busy}
                data-testid={`manage-join-approve-${row.id}`}
                onClick={() => setApproving(row)}
              >
                가입 승인
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
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
                  disabled={busy}
                  onClick={() => void submitReject(row.id)}
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
    </ul>{approving && <ParticipantRecordDialog key={approving.id} clanId={clanId} gameSlug={gameSlug} userId={approving.userId} nickname={approving.nickname} gameTag={approving.gameTag} requestId={approving.id} onClose={() => setApproving(null)} />}</>
  );
}
