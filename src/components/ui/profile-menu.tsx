"use client";

import { useTranslator } from "#use-translator";
import Link from "next/link";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { signOutAction } from "@/app/actions/auth";
import { SITE_LINKS } from "@/lib/site-links";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { headerActionClassName } from "./header-action-style";

export function ProfileMenu() {
  const tx = useTranslator();
  const { resolvedTheme, setTheme } = useTheme();
  const light = resolvedTheme === "light";
  const ThemeIcon = light ? Moon : Sun;
  return <DropdownMenu>
    <DropdownMenuTrigger className={headerActionClassName} aria-label={tx("프로필 메뉴")} title={tx("프로필 메뉴")}>
      <UserRound aria-hidden />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} showArrow className="w-44">
      <DropdownMenuItem className="min-h-11" render={<Link href="/profile" />}>
        <UserRound aria-hidden />{tx("프로필")}
      </DropdownMenuItem>
      <DropdownMenuItem className="min-h-11" onClick={() => setTheme(light ? "dark" : "light")}>
        <ThemeIcon aria-hidden />{light ? tx("다크 모드로 전환") : tx("라이트 모드로 전환")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>{tx("서비스 안내")}</DropdownMenuLabel>
        {SITE_LINKS.map(({ href, label }) => (
          <DropdownMenuItem key={href} className="min-h-11" render={<Link href={href} />}>
            {tx(label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="min-h-11" onClick={() => signOutAction()}>
        <LogOut aria-hidden />{tx("로그아웃")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
