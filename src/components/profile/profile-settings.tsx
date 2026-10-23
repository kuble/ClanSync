"use client";

import type { ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProfileSettings({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
        data-testid="profile-settings-open"
      >
        <Settings2 aria-hidden="true" className="size-4" />
        프로필 설정
      </DialogTrigger>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[720px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle>프로필 설정</DialogTitle>
          <DialogDescription>
            계정과 게임 연동, 클랜 가입 정보를 관리하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="board-scroll min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
