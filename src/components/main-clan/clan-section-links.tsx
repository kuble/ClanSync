"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import lineStyles from "@/components/ui/line-tabs.module.css";
import { StatTooltip } from "./stat-help";

/** Route links retain direct URLs, browser history and the server's section permissions. */
export function ClanSectionLinks({ label, items, compact = false }: {
  label: string;
  items: { href: string; label: string; selected: boolean; icon?: ReactNode; badge?: ReactNode; description?: string }[];
  compact?: boolean;
}) {
  return <nav aria-label={label} className={cn("relative min-w-0 max-w-full overflow-x-auto [scrollbar-width:thin]", !compact && "border-b border-border")}>
    <div className={cn("flex w-max gap-2", !compact && ["min-w-full", lineStyles.list])}>
      {items.map((item) => {
        const content = <>{item.icon}{item.label}{item.badge}</>;
        const link = <Link key={item.href} href={item.href} scroll={false} prefetch={false}
        aria-current={item.selected ? "page" : undefined}
        className={cn("flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          compact ? "rounded-lg" : ["flex-1", lineStyles.item],
          item.selected ? compact ? "bg-primary/10 text-primary" : "text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
          {content}
        </Link>;
        return item.description ? <StatTooltip key={item.href} label={item.label} description={item.description} render={link}>{content}</StatTooltip> : link;
      })}
    </div>
  </nav>;
}
