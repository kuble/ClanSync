"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClanParticipant } from "@/app/actions/clan-participants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ClanParticipantEditor({ clanId, participant }: { clanId: string; participant?: { id: string; nickname: string } }) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(participant?.nickname ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return <>
    <Button type="button" size="sm" variant="outline" onClick={() => { setError(""); setOpen(true); }} aria-label={participant ? `${participant.nickname} 닉네임 수정` : undefined}>{participant ? "닉네임 수정" : "미가입 참가자 추가"}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogContent><DialogHeader><DialogTitle>{participant ? "참가자 수정" : "미가입 참가자 추가"}</DialogTitle><DialogDescription>다음 내전에도 같은 참가자를 선택해 기록을 이어갈 수 있습니다.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); start(async () => {
          const result = await saveClanParticipant({ clanId, id: participant?.id, nickname });
          if (!result.ok) { setError(result.error); return; }
          setOpen(false); if (!participant) setNickname(""); router.refresh();
        }); }}>
          <label className="block space-y-2 text-xs font-semibold">게임 닉네임<input aria-label="참가자 게임 닉네임" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" required maxLength={32} value={nickname} disabled={pending} onChange={(event) => setNickname(event.target.value)} /></label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end"><Button size="sm" type="submit" disabled={pending}>{pending ? "저장 중" : "참가자 저장"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
