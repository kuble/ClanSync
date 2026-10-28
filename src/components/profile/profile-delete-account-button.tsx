"use client";
import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { deleteAccountAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ProfileDeleteAccountButton() {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function confirmDelete() {
    setError(null);
    start(async () => {
      const result = await deleteAccountAction();
      if (result?.error) setError(result.error);
    });
  }
  return <>
    <Button type="button" variant="destructive" size="sm" onClick={() => { setError(null); setOpen(true); }}><LogOut className="size-3.5" aria-hidden="true" />클랜싱크 탈퇴</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
      <DialogContent showCloseButton={!pending} className="gap-0 p-0 sm:max-w-md" style={{ scrollbarGutter: "auto" }}>
        <div className="min-w-0 space-y-4 break-keep p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-6">클랜싱크를 탈퇴할까요?</DialogTitle>
            <DialogDescription className="leading-relaxed">계정과 개인정보, 게임 연동, 보유 코인·아이템·엠블럼이 삭제되며 복구할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">클랜의 공동 기록과 작성한 글·댓글, 기록에 남은 이름은 유지됩니다. 삭제할 게시물은 탈퇴 전에 정리해 주세요.</p>
          {error ? <p className="text-sm leading-relaxed text-destructive" role="alert">{error}</p> : null}
        </div>
        <DialogFooter className="m-0 px-5 py-4 sm:px-6"><Button type="button" className="h-11 sm:h-8" variant="outline" disabled={pending} onClick={() => setOpen(false)}>취소</Button><Button type="button" className="h-11 sm:h-8" variant="destructive" disabled={pending} onClick={confirmDelete}>{pending ? "처리 중…" : "클랜싱크 탈퇴하기"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
