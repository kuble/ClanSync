"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { signOutAction } from "@/app/actions/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { headerActionClassName } from "./header-action-style";

export function ProfileMenu() {
  const { resolvedTheme, setTheme } = useTheme();
  const light = resolvedTheme === "light";
  const ThemeIcon = light ? Moon : Sun;
  return <DropdownMenu>
    <DropdownMenuTrigger className={headerActionClassName} aria-label="프로필 메뉴" title="프로필 메뉴">
      <UserRound aria-hidden />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} showArrow className="w-44">
      <DropdownMenuItem className="min-h-11" render={<Link href="/profile" />}>
        <UserRound aria-hidden />프로필
      </DropdownMenuItem>
      <DropdownMenuItem className="min-h-11" onClick={() => setTheme(light ? "dark" : "light")}>
        <ThemeIcon aria-hidden />{light ? "다크 모드로 전환" : "라이트 모드로 전환"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="min-h-11" onClick={() => signOutAction()}>
        <LogOut aria-hidden />로그아웃
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
