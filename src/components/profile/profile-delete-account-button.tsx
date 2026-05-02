"use client";

import { useTransition } from "react";
import { deleteAccountAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function ProfileDeleteAccountButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        "정말 탈퇴할까요? 계정과 연결된 데이터가 삭제되며 되돌릴 수 없습니다.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result?.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "처리 중…" : "탈퇴"}
    </Button>
  );
}
