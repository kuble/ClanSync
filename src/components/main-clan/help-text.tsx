"use client";

import { useTranslator } from "#use-translator";
import { StatTooltip } from "./stat-help";
import { cn } from "@/lib/utils";

export function HelpText({ label, help, className }: { label: string; help: string; className?: string }) {
  const tx = useTranslator();
  return <StatTooltip label={tx(label)} description={help} className={cn("inline-flex text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring", className)}>
    {tx(label)}
  </StatTooltip>;
}
