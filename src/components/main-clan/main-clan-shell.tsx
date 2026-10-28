"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  Globe2,
  Home,
  Menu,
  MessagesSquare,
  Scale,
  Settings,
  Shield,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ClanInAppNotificationBell } from "@/components/main-clan/clan-inapp-notification-bell";
import type { ClanInAppNotificationVM } from "@/lib/clan/load-clan-inapp-notifications";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";
import { cn } from "@/lib/utils";
import { NavigationIcon } from "@/components/ui/navigation-icon";
import { HeaderBreadcrumbs } from "@/components/ui/header-breadcrumbs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import styles from "./main-clan-shell.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  dot?: boolean;
};

function NavLinks({
  items,
  basePath,
  onNavigate,
}: {
  items: NavItem[];
  basePath: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className={styles.nav}>
      {items.map(({ href, label, icon: Icon, dot }) => {
        const active =
          pathname === href ||
          (href.startsWith(basePath + "/") && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-label={label}
            title={label}
            aria-current={active ? "page" : undefined}
            className={styles.navLink}
            onClick={onNavigate}
          >
            <NavigationIcon icon={Icon} label={label} />
            <span className={styles.navText}>{label}</span>
            {dot ? <span className={styles.dot} aria-hidden /> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function ClanHero({
  ctx,
  basePath,
  children,
  showLobbyAction = true,
  communityLinks,
}: {
  ctx: MainClanContext;
  basePath: string;
  children?: ReactNode;
  showLobbyAction?: boolean;
  communityLinks?: ReactNode;
}) {
  return (
    <section className={styles.hero} aria-label="클랜 소개">
      {ctx.bannerUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- clan-owned external image */}
          <img className={styles.heroImage} src={ctx.bannerUrl} alt="" />
          <div className={styles.heroShade} />
        </>
      ) : null}
      <div className={styles.clanIcon}>
        {ctx.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- clan-owned external image
          <img src={ctx.iconUrl} alt="" />
        ) : (
          <Shield size={28} aria-hidden />
        )}
      </div>
      <div className={styles.clanInfo}>
        <h1>{ctx.clanName}</h1>
        <div className={styles.clanMeta}>
          <span>{ctx.gameName}</span>
          {ctx.memberCount != null ? (
            <span>
              <Users size={13} aria-hidden />
              {ctx.memberCount}명
            </span>
          ) : null}
          {ctx.styleLabel ? <span>{ctx.styleLabel}</span> : null}
          {ctx.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {communityLinks}
      </div>
      <div className={styles.heroAside}>
        {children}
        {ctx.canStartBalance && showLobbyAction ? (
          <Link
            href={basePath + "/balance"}
            className={cn(buttonVariants({ size: "sm" }), styles.heroAction)}
          >
            <NavigationIcon icon={Scale} label="내전 로비" />
            내전 로비 열기
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function MainClanShell({
  ctx,
  inAppNotifications,
  children,
}: {
  ctx: MainClanContext;
  inAppNotifications: { items: ClanInAppNotificationVM[]; unreadCount: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const basePath = `/games/${ctx.gameSlug}/clan/${ctx.clanId}`;
  const showHero = pathname === basePath + "/store";
  const items: NavItem[] = [
    { href: basePath, label: "대시보드", icon: Home },
    {
      href: basePath + "/balance",
      label: "내전 로비",
      icon: Scale,
      dot: ctx.sidebarDots.balance,
    },
    { href: basePath + "/stats", label: "클랜 통계", icon: BarChart3 },
    { href: basePath + "/board", label: "게시판", icon: MessagesSquare },
    {
      href: basePath + "/events",
      label: "이벤트",
      icon: Calendar,
      dot: ctx.sidebarDots.events,
    },
    ...(ctx.role === "leader" || ctx.role === "officer"
      ? [
          {
            href: basePath + "/manage",
            label: "클랜 관리",
            icon: Settings,
            dot: ctx.sidebarDots.manage,
          },
        ]
      : []),
  ];
  const bottomItems: NavItem[] = [
    { href: basePath + "/store", label: "클랜 스토어", icon: Store },
    { href: `/games/${ctx.gameSlug}`, label: "커뮤니티", icon: Globe2 },
    { href: "/profile", label: "프로필", icon: UserRound },
  ];
  const pageTitle = pathname === basePath + "/badges" ? "클랜 배지" : pathname === basePath + "/emblems" ? "개인 엠블럼" : [...items, ...bottomItems].find(({ href }) =>
    pathname === href || (href.startsWith(basePath + "/") && pathname.startsWith(href + "/")),
  )?.label;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        본문으로 이동
      </a>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                styles.mobileTrigger,
              )}
              aria-label="메뉴 열기"
            >
              <Menu aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className={styles.drawer}>
              <SheetHeader className="border-b p-5 text-left">
                <SheetTitle>{ctx.clanName}</SheetTitle>
                <p className="text-xs text-muted-foreground">{ctx.gameName}</p>
              </SheetHeader>
              <nav aria-label="모바일 클랜 메뉴" className="py-3">
                <NavLinks
                  items={items}
                  basePath={basePath}
                  onNavigate={() => setMobileOpen(false)}
                />
                <div className={styles.bottom}>
                  <NavLinks
                    items={bottomItems}
                    basePath={basePath}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <HeaderBreadcrumbs hideFirstOnMobile items={[
            { label: ctx.gameName, href: `/games/${ctx.gameSlug}` },
            { label: ctx.clanName, href: basePath },
            ...(pageTitle ? [{ label: pageTitle }] : []),
          ]} />
        </div>
        <div className={styles.headerRight}>
          <ThemeToggle />
          {ctx.plan === "premium" ? (
            <span className={styles.plan}>Premium</span>
          ) : null}
          <ClanInAppNotificationBell
            gameSlug={ctx.gameSlug}
            clanId={ctx.clanId}
            initialItems={inAppNotifications.items}
            initialUnreadCount={inAppNotifications.unreadCount}
          />
        </div>
      </header>
      <aside className={styles.rail} aria-label="클랜 탐색">
        <nav aria-label="클랜 메뉴">
          <NavLinks items={items} basePath={basePath} />
        </nav>
        <div className={styles.bottom}>
          <nav aria-label="계정 및 커뮤니티">
            <NavLinks items={bottomItems} basePath={basePath} />
          </nav>
        </div>
      </aside>
      <main id="main-content" className={styles.content}>
        <div className={styles.inner}>
          {showHero ? <ClanHero ctx={ctx} basePath={basePath} showLobbyAction={false} /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
