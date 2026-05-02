"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  replacePendingJoinRequestAction,
  submitClanJoinRequestAction,
} from "@/app/actions/game-clan-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const JOIN_TOAST_DURATION_MS = 4800;
const JOIN_REFRESH_DELAY_MS = 2600;

export type ClanListRow = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  max_members: number;
};

export function ClanJoinList({
  gameSlug,
  clans,
}: {
  gameSlug: string;
  clans: ClanListRow[];
}) {
  const router = useRouter();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClanListRow | null>(null);
  const [message, setMessage] = useState("");
  const [blockName, setBlockName] = useState("");
  const [busy, setBusy] = useState(false);

  function openApply(clan: ClanListRow) {
    setApplyingId((id) => (id === clan.id ? null : clan.id));
    setSelected(clan);
    setMessage("");
  }

  async function runSubmit(replace: boolean) {
    if (!selected) return;
    setBusy(true);
    const tid = toast.loading(
      replace ? "신청을 옮기는 중…" : "가입 신청을 보내는 중…",
    );
    try {
      const r = replace
        ? await replacePendingJoinRequestAction(gameSlug, selected.id, message)
        : await submitClanJoinRequestAction(gameSlug, selected.id, message);
      toast.dismiss(tid);
      if (r.ok) {
        toast.success(
          replace
            ? "기존 신청을 취소하고 새로 신청했습니다."
            : "가입 신청을 보냈습니다.",
          { duration: JOIN_TOAST_DURATION_MS },
        );
        setApplyingId(null);
        setReplaceOpen(false);
        /* 토스트가 보인 뒤 RSC 새로고침 — 너무 빠른 refresh 가 시각 피드백을 삼킴 */
        window.setTimeout(() => router.refresh(), JOIN_REFRESH_DELAY_MS);
        return;
      }
      if (r.error.startsWith("PENDING_ELSEWHERE:")) {
        toast.message("다른 클랜에 신청 중입니다", {
          description:
            "아래 대화상자에서 기존 신청을 취소하고 새로 신청할 수 있습니다.",
          duration: 5200,
        });
        setBlockName(r.error.slice("PENDING_ELSEWHERE:".length));
        setReplaceOpen(true);
        return;
      }
      toast.error(r.error, { duration: 6500 });
    } catch (e) {
      toast.dismiss(tid);
      console.error(e);
      toast.error(
        "처리 중 오류가 났습니다. 네트워크와 로그인 상태를 확인해 주세요.",
        { duration: 6500 },
      );
    } finally {
      setBusy(false);
    }
  }

  if (clans.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        조건에 맞는 클랜이 없습니다. 검색어를 바꾸거나 클랜을 만들어 보세요.
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-4">
        {clans.map((c) => (
          <li key={c.id}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{c.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {c.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {c.tags.slice(0, 5).map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                  <span className="text-muted-foreground text-xs">
                    정원 {c.max_members}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid={`clan-join-open-${c.id}`}
                  className={cn(
                    buttonVariants({
                      variant: applyingId === c.id ? "secondary" : "default",
                      size: "sm",
                    }),
                  )}
                  aria-expanded={applyingId === c.id}
                  onClick={() => openApply(c)}
                >
                  {applyingId === c.id ? "신청 폼 닫기" : "가입 신청"}
                </button>

                {applyingId === c.id ? (
                  <div className="border-border space-y-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{c.name}에 신청</p>
                    <p className="text-muted-foreground text-xs">
                      운영진에게 전달할 메시지(선택)를 적고 보내기를 누르세요.
                    </p>
                    <textarea
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                      placeholder="자기소개 (선택)"
                      maxLength={2000}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-testid={`clan-join-send-${c.id}`}
                        className={cn(buttonVariants({ size: "sm" }))}
                        disabled={busy}
                        onClick={() => void runSubmit(false)}
                      >
                        보내기
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setApplyingId(null)}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>진행 중인 신청이 있습니다</DialogTitle>
            <DialogDescription>
              현재 「{blockName}」에 가입 신청 중입니다. 취소하고 이 클랜으로 새로
              신청할까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setReplaceOpen(false)}>
              아니오
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void runSubmit(true)}
            >
              취소 후 새로 신청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
