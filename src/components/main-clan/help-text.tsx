"use client";

import { StatTooltip } from "./stat-help";
import { cn } from "@/lib/utils";

export function HelpText({ label, help, className }: { label: string; help: string; className?: string }) {
  return <StatTooltip label={label} description={help} className={cn("inline-flex text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring", className)}>
    {label}
  </StatTooltip>;
}
