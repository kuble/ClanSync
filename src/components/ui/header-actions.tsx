import { useTranslator } from "#use-translator";
import type { ReactNode } from "react";
import { AccountGameMenu } from "@/components/onboarding/account-game-menu";
import { ProfileMenu } from "./profile-menu";

export function HeaderActions({ notifications }: { notifications: ReactNode }) {
  const tx = useTranslator();
  return <nav aria-label={tx("계정 메뉴")} data-header-actions className="flex shrink-0 items-center gap-1">
    <AccountGameMenu />
    <ProfileMenu />
    <div className="flex size-8 items-center justify-center sm:size-9 [&>button]:size-8 sm:[&>button]:size-9 [&_svg]:size-4">
      {notifications}
    </div>
  </nav>;
}
