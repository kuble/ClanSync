"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Pointer hover never latches focus open; touch can toggle, keyboard uses focus/Escape. */
export function StatTooltip({ label, children, description, className }: { label: string; children: ReactNode; description: ReactNode; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const touch = useRef(false);
  return <Tooltip open={open} disableHoverablePopup onOpenChange={(next, details) => {
    // Touch taps are handled below; synthetic focus/press must not immediately close them.
    if (touch.current && ["trigger-focus", "trigger-press", "trigger-hover"].includes(details.reason)) return;
    setOpen(next);
  }}><TooltipTrigger render={<button type="button" aria-label={label} aria-describedby={open ? id : undefined}
    onPointerEnter={(event) => { touch.current = event.pointerType === "touch"; }}
    onPointerDown={(event) => { touch.current = event.pointerType === "touch"; }}
    onPointerLeave={(event) => { if (event.pointerType !== "touch") setOpen(false); }}
    onFocus={() => { if (!touch.current) setOpen(true); }} onBlur={() => setOpen(false)} onClick={() => { if (touch.current) setOpen((value) => !value); }}
    className={className} />} >{children}</TooltipTrigger><TooltipContent id={id} role="tooltip" className="pointer-events-none max-w-72 text-pretty leading-relaxed">{description}</TooltipContent></Tooltip>;
}
export function StatHelp({ title, children }: { title: string; children: ReactNode }) {
  return <StatTooltip label={title + " 도움말"} description={children} className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"><Info className="size-3.5" aria-hidden /></StatTooltip>;
}
export function StatTitle({ title, help }: { title: string; help: ReactNode }) {
  return <span className="flex w-full items-center justify-between gap-3"><span>{title}</span><StatHelp title={title}>{help}</StatHelp></span>;
}
