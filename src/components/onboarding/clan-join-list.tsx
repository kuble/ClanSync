"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  replacePendingJoinRequestAction,
  submitClanJoinRequestAction,
} from "@/app/actions/game-clan-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [open, setOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [selected, setSelected] = useState<ClanListRow | null>(null);
  const [message, setMessage] = useState("");
  const [blockName, setBlockName] = useState("");
  const [pending, start] = useTransition();

  function openApply(clan: ClanListRow) {
    setSelected(clan);
    setMessage("");
    setOpen(true);
  }

  function runSubmit(replace: boolean) {
    if (!selected) return;
    start(async () => {
      const r = replace
        ? await replacePendingJoinRequestAction(gameSlug, selected.id, message)
        : await submitClanJoinRequestAction(gameSlug, selected.id, message);
      if (r.ok) {
        toast.success(
          replace ? "기존 신청을 취소하고 새로 신청했습니다." : "가입 신청을 보냈습니다.",
        );
        setOpen(false);
        setReplaceOpen(false);
        router.refresh();
        return;
      }
      if (r.error.startsWith("PENDING_ELSEWHERE:")) {
        setBlockName(r.error.slice("PENDING_ELSEWHERE:".length));
        setReplaceOpen(true);
        return;
      }
      toast.error(r.error);
    });
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
                <Button type="button" size="sm" onClick={() => openApply(c)}>
                  가입 신청
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name} 가입 신청</DialogTitle>
            <DialogDescription>
              운영진에게 전달할 짧은 메시지를 남길 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
            placeholder="자기소개 (선택)"
            maxLength={2000}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => runSubmit(false)}
            >
              보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button type="button" disabled={pending} onClick={() => runSubmit(true)}>
              취소 후 새로 신청
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
