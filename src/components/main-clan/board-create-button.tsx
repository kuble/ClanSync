"use client";

import type { MouseEventHandler } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTooltip } from "./stat-help";

export const boardCreateClass = "fixed right-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-30 size-14 rounded-full shadow-lg transition-transform hover:scale-105 motion-reduce:transform-none sm:right-7 sm:bottom-[calc(24px+env(safe-area-inset-bottom,0px))]";

export function BoardCreateButton({ label, onClick }: { label: string; onClick: MouseEventHandler<HTMLButtonElement> }) {
  return <StatTooltip label={label} description={label} render={<Button type="button" size="icon" className={boardCreateClass} aria-label={label} onClick={onClick} />}><Plus className="size-6" aria-hidden /></StatTooltip>;
}
