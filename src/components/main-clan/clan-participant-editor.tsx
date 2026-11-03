"use client";

import { useTranslator } from "#use-translator";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { saveClanParticipant } from "@/app/actions/clan-participants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HelpText } from "./help-text";

export function ClanParticipantEditor({ clanId, participant }: { clanId: string; participant?: { id: string; nickname: string } }) {
  const tx = useTranslator();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(participant?.nickname ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const nicknameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const help = participant ? "이름을 바꿔도 지금까지의 내전 기록은 유지됩니다." : "홈페이지에 가입하지 않아도 기록을 남길 수 있습니다. 나중에 가입하면 운영진이 계정에 연결할 수 있습니다.";
  return <>
    <Button type="button" size="icon-sm" variant={participant ? "ghost" : "outline"} onClick={() => { setError(""); setOpen(true); }} aria-label={participant ? tx("{0} 닉네임 수정", participant.nickname) : tx("미가입 참가자 추가")} title={participant ? tx("닉네임 수정") : tx("미가입 참가자 추가")}>{participant ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogContent initialFocus={nicknameRef}><DialogHeader><DialogTitle><HelpText label={participant ? tx("참가자 닉네임 수정") : tx("미가입 참가자 추가")} help={help} /></DialogTitle><DialogDescription className="sr-only">{help}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); start(async () => {
          const result = await saveClanParticipant({ clanId, id: participant?.id, nickname });
          if (!result.ok) { setError(result.error); return; }
          setOpen(false); if (!participant) setNickname(""); router.refresh();
        }); }}>
          <label className="block"><span className="sr-only">{tx("인게임 닉네임")}</span><input ref={nicknameRef} placeholder={tx("인게임 닉네임 (예: AIMZERO)")} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" required maxLength={32} value={nickname} disabled={pending} onChange={(event) => setNickname(event.target.value)} /></label>
          {error && <p role="alert" className="text-xs text-destructive">{tx(error)}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>{tx("취소")}</Button><Button size="sm" type="submit" disabled={pending}>{pending ? tx("저장 중…") : participant ? tx("변경 저장") : tx("참가자 추가")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
