"use client";

import { Info } from "lucide-react";
import { StatTooltip } from "./stat-help";
import { cn } from "@/lib/utils";

export function HelpText({ label, help, className }: { label: string; help: string; className?: string }) {
  return <StatTooltip label={label} description={help} className={cn("inline-flex items-center gap-1.5 text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring", className)}>
    {label}<Info aria-hidden className="size-3.5 shrink-0 text-muted-foreground/70" />
  </StatTooltip>;
}
