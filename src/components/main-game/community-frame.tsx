"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Gamepad2,
  Home,
  Layers3,
  Megaphone,
  Menu,
  Search,
  Shield,
  Swords,
  UserRound,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MainGameCommunityTab } from "@/lib/main-game/main-game-community-tab";
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
    description: "클랜 모집·파티·스크림·활동을 한눈에 확인하세요.",
  },
  {
    value: "lfg",
    label: "LFG",
    icon: Search,
    description: "같이 플레이할 팀원을 찾고 파티를 만들어보세요.",
  },
  {
    value: "scrim",
    label: "스크림",
    icon: Swords,
    description: "상대 클랜을 찾고 함께 경기를 준비하세요.",
  },
  {
    value: "promo",
    label: "홍보",
    icon: Megaphone,
    description: "새로운 인연을 기다리는 클랜을 만나보세요.",
  },
  {
    value: "rank",
    label: "순위",
    icon: BarChart3,
    description: "최근 활동을 기준으로 클랜들을 둘러보세요.",
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
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 769px)");
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
        본문으로 이동
      </a>
      <header className={styles.header}>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className={styles.mobileTrigger} aria-label="메뉴 열기">
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-5">
              <SheetTitle>{gameName} 커뮤니티</SheetTitle>
            </SheetHeader>
            <nav aria-label="모바일 커뮤니티 메뉴" className={styles.drawerNav}>
              {navigation.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-current={value === tab ? "page" : undefined}
                  onClick={() => navigate(value)}
                >
                  <Icon aria-hidden />
                  {label}
                </button>
              ))}
              <Link href={clanHubHref}>
                <Shield aria-hidden />
                {clanLabel}
              </Link>
              <Link href="/profile">
                <UserRound aria-hidden />
                프로필
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/games" className={styles.brand} aria-label="게임 선택">
          <Layers3 size={18} aria-hidden />
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/games/${encodeURIComponent(gameSlug)}`}>{gameName}</Link>
        <Link
          href={clanHubHref}
          className={styles.headerAction}
          aria-label={clanLabel}
        >
          <Shield size={15} aria-hidden />
          <span>{clanLabel}</span>
        </Link>
      </header>
      <aside className={styles.rail} aria-label="커뮤니티 탐색">
        <TabsList
          variant="line"
          className={styles.nav}
          aria-label="커뮤니티 메뉴"
        >
          {navigation.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              aria-label={label}
              title={label}
              className={styles.navItem}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <nav className={styles.bottom} aria-label="계정 및 클랜">
          <Link href={clanHubHref} aria-label={clanLabel} title={clanLabel}>
            <Shield aria-hidden />
            <span>{clanLabel}</span>
          </Link>
          <Link href="/profile" aria-label="프로필" title="프로필">
            <UserRound aria-hidden />
            <span>프로필</span>
          </Link>
        </nav>
      </aside>
      <main id="community-content" className={styles.content}>
        <div className={styles.inner}>
          <div className={styles.pageHead}>
            <span className={styles.pageIcon}>
              <Gamepad2 aria-hidden />
            </span>
            <div>
              <h1>
                {tab === "home"
                  ? gameName + " 커뮤니티"
                  : tab === "lfg"
                    ? "같이 할 사람"
                    : current.label}
              </h1>
              <p>{current.description}</p>
            </div>
          </div>
          {!gameActive ? (
            <p className="mb-4 text-sm text-muted-foreground">
              이 게임은 현재 비활성 상태입니다.
            </p>
          ) : null}
          {children}
        </div>
      </main>
    </Tabs>
  );
}
