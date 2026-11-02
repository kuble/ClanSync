import type { ReactNode } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { AccountGameMenu } from "@/components/onboarding/account-game-menu";
import { ThemeToggle } from "./theme-toggle";
import { headerActionClassName } from "./header-action-style";

export function HeaderActions({ notifications }: { notifications: ReactNode }) {
  return <nav aria-label="계정 메뉴" data-header-actions className="flex shrink-0 items-center gap-1">
    <ThemeToggle className={headerActionClassName} />
    <AccountGameMenu />
    <Link href="/profile" aria-label="프로필" title="프로필" className={headerActionClassName}><UserRound aria-hidden /></Link>
    <div className="flex size-8 items-center justify-center sm:size-9 [&>button]:size-8 sm:[&>button]:size-9 [&_svg]:size-4">
      {notifications}
    </div>
  </nav>;
}
