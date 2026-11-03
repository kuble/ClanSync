"use client";

import { useTranslator } from "#use-translator";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Gamepad2,
  Home,
  Megaphone,
  Menu,
  Search,
  Shield,
  Swords,
  UserRound,
} from "lucide-react";
import { ClanSectionPicker } from "@/components/main-clan/clan-section-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MainGameCommunityTab } from "@/lib/main-game/main-game-community-tab";
import { NavigationIcon } from "@/components/ui/navigation-icon";
import { BrandSymbol } from "@/components/ui/brand-logo";
import { ProfileMenu } from "@/components/ui/profile-menu";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import styles from "./community.module.css";

const navigation: {
  value: MainGameCommunityTab;
  label: string;
  icon: typeof Home;
  description: string;
}[] = [
  {
    value: "home",
    label: "홈",
    icon: Home,
    description: "클랜 모집·파티·스크림·활동을 한눈에 확인하십시오.",
  },
  {
    value: "lfg",
    label: "LFG",
    icon: Search,
    description: "같이 플레이할 팀원을 찾고 파티를 만들어보십시오.",
  },
  {
    value: "scrim",
    label: "스크림",
    icon: Swords,
    description: "상대 클랜을 찾고 함께 경기를 준비하십시오.",
  },
  {
    value: "promo",
    label: "홍보",
    icon: Megaphone,
    description: "새로운 인연을 기다리는 클랜을 만나보십시오.",
  },
  {
    value: "rank",
    label: "순위",
    icon: BarChart3,
    description: "최근 활동을 기준으로 클랜들을 둘러보십시오.",
  },
];

export function CommunityFrame({
  gameName,
  gameSlug,
  clanLabel,
  clanHubHref,
  gameActive,
  tab,
  onNavigate,
  children,
}: {
  gameName: string;
  gameSlug: string;
  clanLabel: string;
  clanHubHref: string;
  gameActive: boolean;
  tab: MainGameCommunityTab;
  onNavigate: (value: MainGameCommunityTab) => void;
  children: ReactNode;
}) {
  const tx = useTranslator();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 960px)");
    const close = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  const current = navigation.find((n) => n.value === tab)!;
  const navigate = (next: MainGameCommunityTab) => {
    onNavigate(next);
    setMobileOpen(false);
  };
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => navigate(value as MainGameCommunityTab)}
      orientation="vertical"
      className={styles.shell}
    >
      <a href="#community-content" className={styles.skip}>
        {tx("본문으로 이동")}
      </a>
      <header className={styles.header}>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), styles.mobileTrigger)} aria-label={tx("메뉴 열기")}>
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-5">
              <SheetTitle>{tx(gameName)} {tx("커뮤니티")}</SheetTitle>
            </SheetHeader>
            <nav aria-label={tx("모바일 커뮤니티 메뉴")} className={styles.drawerNav}>
              <Link href={clanHubHref}>
                <NavigationIcon icon={Shield} label={clanLabel} />
                {clanLabel}
              </Link>
              <Link href="/profile">
                <NavigationIcon icon={UserRound} label={tx("프로필")} />
                {tx("프로필")}
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/games" className={styles.brand} aria-label={tx("게임 선택")}>
          <NavigationIcon icon={BrandSymbol} label={tx("게임 선택")} size={22} />
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/games/${encodeURIComponent(gameSlug)}`}>{tx(gameName)}</Link>
        <Link
          href={clanHubHref}
          className={styles.headerAction}
          aria-label={clanLabel}
        >
          <NavigationIcon icon={Shield} label={clanLabel} size={15} />
          <span>{clanLabel}</span>
        </Link>
        <ProfileMenu />
      </header>
      <main id="community-content" className={styles.content}>
        <div className={styles.inner}>
          <ClanSectionPicker label={tx("커뮤니티 메뉴")} selectionLabel={tx("커뮤니티 선택")} items={navigation.map(({ value, label, icon: Icon }) => ({
            label, icon: <Icon className="size-4" aria-hidden />, selected: value === tab, onSelect: () => navigate(value),
          }))}>
            <aside className={styles.rail} aria-label={tx("커뮤니티 탐색")}>
              <TabsList
                variant="line"
                className={styles.nav}
                aria-label={tx("커뮤니티 메뉴")}
              >
                {navigation.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    aria-label={tx(label)}
                    title={tx(label)}
                    className={styles.navItem}
                  >
                    <Icon aria-hidden />
                    <span>{tx(label)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <nav className={styles.bottom} aria-label={tx("계정 및 클랜")}>
                <Link href={clanHubHref} aria-label={clanLabel} title={clanLabel}>
                  <NavigationIcon icon={Shield} label={clanLabel} />
                  <span>{clanLabel}</span>
                </Link>
                <Link href="/profile" aria-label={tx("프로필")} title={tx("프로필")}>
                  <NavigationIcon icon={UserRound} label={tx("프로필")} />
                  <span>{tx("프로필")}</span>
                </Link>
              </nav>
            </aside>
          </ClanSectionPicker>
          <div className={styles.pageHead}>
            <span className={styles.pageIcon}>
              <Gamepad2 aria-hidden />
            </span>
            <div>
              <h1>
                {tab === "home"
                  ? gameName + " 커뮤니티"
                  : tab === "lfg"
                    ? tx("같이 할 사람")
                    : current.label}
              </h1>
              <p>{current.description}</p>
            </div>
          </div>
          {!gameActive ? (
            <p className="mb-4 text-sm text-muted-foreground">
              {tx("이 게임은 현재 비활성 상태입니다.")}
            </p>
          ) : null}
          {children}
        </div>
      </main>
    </Tabs>
  );
}
