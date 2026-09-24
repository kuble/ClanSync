"use client";

import { useId, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function StatHelp({ title, children }: { title: string; children: ReactNode }) {
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={setOpen}><TooltipTrigger render={<button type="button" aria-label={`${title} 도움말`} aria-describedby={open ? descriptionId : undefined} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary" />}><Info className="size-3.5" aria-hidden /></TooltipTrigger><TooltipContent id={descriptionId} role="tooltip" className="max-w-72 text-pretty leading-relaxed">{children}</TooltipContent></Tooltip>;
}
export function StatTitle({ title, help }: { title: string; help: ReactNode }) {
  return <span className="inline-flex items-center gap-1">{title}<StatHelp title={title}>{help}</StatHelp></span>;
}
