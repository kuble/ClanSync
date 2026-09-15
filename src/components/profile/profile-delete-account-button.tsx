"use client";
import { useState, useTransition } from "react";
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
    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setError(null); setOpen(true); }}>탈퇴</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
      <DialogContent><DialogHeader><DialogTitle>ClanSync에서 탈퇴할까요?</DialogTitle><DialogDescription>계정과 연결된 데이터가 삭제되며 되돌릴 수 없습니다. 유지할 정보가 있는지 확인해 주세요.</DialogDescription></DialogHeader>
        {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>취소</Button><Button type="button" variant="destructive" disabled={pending} onClick={confirmDelete}>{pending ? "처리 중…" : "탈퇴하기"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
