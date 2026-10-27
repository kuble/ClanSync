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
    <Button type="button" variant="destructive" size="sm" onClick={() => { setError(null); setOpen(true); }}>클랜싱크 탈퇴</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>클랜싱크를 탈퇴할까요?</DialogTitle><DialogDescription>클랜 하나에서 나가는 것이 아니라 클랜싱크 계정 전체를 삭제합니다. 완료 후 복구할 수 없습니다.</DialogDescription></DialogHeader>
        <section aria-label="클랜싱크 탈퇴 시 삭제되는 항목" className="rounded-lg border p-3"><h3 className="text-sm font-semibold text-destructive">탈퇴 완료 시 삭제되는 정보</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground"><li>로그인 계정과 이메일·성별·출생 연도·한 줄 소개 등 개인 정보</li><li>게임 연동 정보·등록한 부계정·선호 역할과 모든 클랜의 소속 정보</li><li>보유 코인·개인 구매 내역·꾸미기 아이템·개인 엠블럼과 설정</li></ul></section>
        <section aria-label="클랜싱크 탈퇴 후 남는 항목" className="rounded-lg border p-3"><h3 className="text-sm font-semibold">삭제되지 않고 남는 정보</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground"><li>클랜 자체와 다른 멤버의 정보, 일정·내전·투표·대진표·스크림 기록</li><li>클랜 게시판 글·댓글, 공지·규칙, 명예의 전당 댓글은 작성자 계정 연결을 해제하고 보관</li><li>연동한 게임사의 계정과 게임 내 데이터</li></ul><p className="mt-2 text-xs leading-relaxed text-muted-foreground">공동 기록·게시물에 적힌 이름이나 본문까지 자동 삭제되지는 않습니다. 삭제할 게시물은 탈퇴 전에 정리해 주세요.</p></section>
        <p className="text-xs leading-relaxed text-muted-foreground">일정·운영 기록은 계정 연결만 해제하며, 누가 운영했는지 알 수 있도록 운영자 이름을 텍스트로 남깁니다. 기록에 남은 이름은 프로필로 연결되지 않습니다. 재가입해도 삭제된 개인 데이터는 복구되지 않습니다.</p>
        {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>취소</Button><Button type="button" variant="destructive" disabled={pending} onClick={confirmDelete}>{pending ? "처리 중…" : "클랜싱크 탈퇴하기"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
