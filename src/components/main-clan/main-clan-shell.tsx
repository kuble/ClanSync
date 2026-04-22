"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Calendar,
  LayoutDashboard,
  Menu,
  Scale,
  Settings,
  Store,
} from "lucide-react";
import { toggleClanPlanDevFormAction } from "@/app/actions/main-clan-shell";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  dot?: boolean;
  officerOnly?: boolean;
};

function NavDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="bg-destructive absolute -top-0.5 -right-0.5 size-2 rounded-full"
      aria-hidden
    />
  );
}

function SidebarNavRail({
  items,
  basePath,
}: {
  items: NavItem[];
  basePath: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {items.map((item) => {
        const active =
          item.href === basePath
            ? pathname === basePath
            : pathname.startsWith(`${item.href}/`) || pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "group/item text-muted-foreground hover:bg-muted/80 hover:text-foreground relative flex h-11 items-center overflow-hidden rounded-lg transition-colors",
              "justify-center gap-0 px-0",
              "group-hover/nav:justify-start group-hover/nav:gap-3 group-hover/nav:px-3",
              active && "bg-primary/15 text-foreground",
            )}
          >
            <span className="relative shrink-0">
              <Icon className="size-5" aria-hidden />
              <NavDot show={item.dot ?? false} />
            </span>
            <span
              className={cn(
                "max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,opacity] duration-200",
                "group-hover/nav:max-w-[160px] group-hover/nav:opacity-100",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarNavDrawer({
  items,
  basePath,
  onNavigate,
}: {
  items: NavItem[];
  basePath: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const active =
          item.href === basePath
            ? pathname === basePath
            : pathname.startsWith(`${item.href}/`) || pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <span className="relative shrink-0">
              <Icon className="size-5" aria-hidden />
              <NavDot show={item.dot ?? false} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MainClanShell({
  ctx,
  showDevPlanToggle,
  children,
}: {
  ctx: MainClanContext;
  showDevPlanToggle: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const basePath = `/games/${ctx.gameSlug}/clan/${ctx.clanId}`;
  const togglePlan = toggleClanPlanDevFormAction.bind(
    null,
    ctx.gameSlug,
    ctx.clanId,
  );

  const allItems: NavItem[] = [
    { href: basePath, label: "대시보드", icon: LayoutDashboard },
    {
      href: `${basePath}/balance`,
      label: "밸런스",
      icon: Scale,
      dot: ctx.sidebarDots.balance,
    },
    { href: `${basePath}/stats`, label: "통계", icon: BarChart3 },
    {
      href: `${basePath}/events`,
      label: "이벤트",
      icon: Calendar,
      dot: ctx.sidebarDots.events,
    },
    {
      href: `${basePath}/manage`,
      label: "관리",
      icon: Settings,
      dot: ctx.sidebarDots.manage,
      officerOnly: true,
    },
    { href: `${basePath}/store`, label: "스토어", icon: Store },
  ];

  const items = allItems.filter(
    (i) => !i.officerOnly || ctx.role === "leader" || ctx.role === "officer",
  );

  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border fixed top-0 right-0 left-0 z-20 flex h-14 items-center justify-between border-b bg-card px-3 md:left-16">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "md:hidden shrink-0",
              )}
            >
              <Menu className="size-5" />
              <span className="sr-only">메뉴 열기</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(248px,76vw)] p-0">
              <SheetHeader className="border-b p-4 text-left">
                <SheetTitle className="truncate text-base">{ctx.clanName}</SheetTitle>
                <p className="text-muted-foreground text-xs font-normal">
                  {ctx.gameName}
                </p>
              </SheetHeader>
              <SidebarNavDrawer
                items={items}
                basePath={basePath}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold md:text-base">{ctx.clanName}</h1>
            <p className="text-muted-foreground hidden text-xs sm:block">{ctx.gameName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              ctx.plan === "premium"
                ? "bg-amber-500/20 text-amber-200"
                : "bg-muted text-muted-foreground",
            )}
          >
            {ctx.plan === "premium" ? "Premium" : "Free"}
          </span>
          <Link
            href="/games"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            게임 선택
          </Link>
        </div>
      </header>

      <aside
        className={cn(
          "border-border bg-card group/nav fixed inset-y-0 left-0 z-30 hidden w-16 overflow-x-hidden border-r transition-[width] duration-200 ease-out",
          "hover:w-56",
          "md:block",
        )}
      >
        <div className="flex h-full flex-col pt-14">
          <SidebarNavRail items={items} basePath={basePath} />
          {showDevPlanToggle && ctx.role === "leader" ? (
            <form action={togglePlan} className="border-border mt-auto border-t p-2">
              <Button type="submit" variant="outline" size="sm" className="w-full text-xs">
                플랜 전환
              </Button>
              <p className="text-muted-foreground mt-1 px-1 text-[0.65rem] leading-tight">
                개발용
              </p>
            </form>
          ) : null}
        </div>
      </aside>

      <main className="min-h-dvh pt-14 md:pl-16">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">{children}</div>
      </main>
    </div>
  );
}
