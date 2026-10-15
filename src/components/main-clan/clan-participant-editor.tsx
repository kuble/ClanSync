"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
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
    <Button type="button" size="icon-sm" variant={participant ? "ghost" : "outline"} onClick={() => { setError(""); setOpen(true); }} aria-label={participant ? `${participant.nickname} 닉네임 수정` : "미가입 참가자 추가"} title={participant ? "닉네임 수정" : "미가입 참가자 추가"}>{participant ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogContent><DialogHeader><DialogTitle>{participant ? "참가자 닉네임 수정" : "미가입 참가자 추가"}</DialogTitle><DialogDescription>{participant ? "이름을 바꿔도 지금까지의 내전 기록은 유지됩니다." : "홈페이지에 가입하지 않아도 기록을 남길 수 있어요. 나중에 가입하면 운영진이 계정에 연결할 수 있습니다."}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); start(async () => {
          const result = await saveClanParticipant({ clanId, id: participant?.id, nickname });
          if (!result.ok) { setError(result.error); return; }
          setOpen(false); if (!participant) setNickname(""); router.refresh();
        }); }}>
          <label className="block space-y-2 text-xs font-semibold">게임에서 보이는 이름<input aria-label="참가자 게임 닉네임" placeholder="예: AIMZERO" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" required maxLength={32} value={nickname} disabled={pending} onChange={(event) => setNickname(event.target.value)} /></label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>취소</Button><Button size="sm" type="submit" disabled={pending}>{pending ? "저장 중…" : participant ? "변경 저장" : "참가자 추가"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
