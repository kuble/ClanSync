"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { clanBasePath } from "@/lib/clan/paths";

type TabDef = {
  segment: string;
  label: string;
  officerOnly?: boolean;
};

const tabs: TabDef[] = [
  { segment: "", label: "홈" },
  { segment: "balance", label: "밸런스", officerOnly: true },
  { segment: "stats", label: "통계" },
  { segment: "events", label: "이벤트" },
  { segment: "manage", label: "관리", officerOnly: true },
  { segment: "store", label: "스토어" },
];

interface ClanTabNavProps {
  locale: string;
  gameSlug: string;
  clanId: string;
  isOfficer: boolean;
}

export function ClanTabNav({
  locale,
  gameSlug,
  clanId,
  isOfficer,
}: ClanTabNavProps) {
  const pathname = usePathname();
  const base = clanBasePath(locale, gameSlug, clanId);

  const visible = tabs.filter((t) => !t.officerOnly || isOfficer);

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border pb-px"
      aria-label="클랜 섹션"
    >
      {visible.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active =
          tab.segment === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.segment || "home"}
            href={href}
            className={cn(
              "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
