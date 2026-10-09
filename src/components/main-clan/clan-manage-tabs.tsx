"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CreditCard, ImageIcon, LayoutDashboard, Megaphone, Swords, UserRoundPlus, Users } from "lucide-react";
import { MANAGE_SECTIONS, type ManageTab } from "@/lib/clan/manage-sections";
import { NavigationIcon } from "@/components/ui/navigation-icon";
import { cn } from "@/lib/utils";

const icons = { overview: LayoutDashboard, notices: Megaphone, appearance: ImageIcon, requests: UserRoundPlus, members: Users, balance: Swords, insights: BarChart3, subscription: CreditCard };

/** Server navigation loads only the selected section, including on refresh/back. */
export function ClanManageNavigation({ selected, pendingCount, basePath }: {
  selected: ManageTab;
  pendingCount: number;
  basePath: string;
}) {
  const router = useRouter();
  useEffect(() => {
    // Preserve old plan links saved before query-based navigation.
    if (window.location.hash === "#subscription" && selected !== "subscription") {
      router.replace(`${basePath}?tab=subscription`, { scroll: false });
    }
  }, [basePath, router, selected]);

  return (
    <>
    <label className="block space-y-2 lg:hidden"><span className="text-xs font-medium text-muted-foreground">관리 항목</span>
      <select aria-label="클랜 관리 항목" value={selected} onChange={(event) => router.push(`${basePath}?tab=${event.target.value}`, { scroll: false })} className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm">
        {[...new Set(MANAGE_SECTIONS.map((section) => section.group))].map((group) => <optgroup key={group} label={group}>{MANAGE_SECTIONS.filter((section) => section.group === group).map(({ key, label }) => <option key={key} value={key}>{label}{key === "requests" && pendingCount > 0 ? ` (${pendingCount})` : ""}</option>)}</optgroup>)}
      </select>
    </label>
    <nav aria-label="클랜 관리 항목" className="hidden gap-4 rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20 lg:grid lg:self-start">
      {[...new Set(MANAGE_SECTIONS.map((section) => section.group))].map((group) => (
        <div key={group} className="min-w-0 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold text-muted-foreground">{group}</p>
          {MANAGE_SECTIONS.filter((section) => section.group === group).map(({ key, label }) => (
            <Link
              key={key}
              href={`${basePath}?tab=${key}`}
              scroll={false}
              prefetch={false}
              aria-current={key === selected ? "page" : undefined}
              className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", key === selected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <NavigationIcon icon={icons[key]} label={label} />
              <span>{label}</span>
              {key === "requests" && pendingCount > 0 && <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">{pendingCount}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
    </>
  );
}
