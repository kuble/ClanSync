"use client";

import { useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Pointer hover never latches focus open; touch can toggle, keyboard uses focus/Escape. */
export function StatTooltip({ label, children, description, className, render, hoverable = false }: { label: string; children: ReactNode; description: ReactNode; className?: string; render?: ReactElement<Record<string, unknown>>; hoverable?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const touch = useRef(false);
  return <Tooltip open={open} disableHoverablePopup={!hoverable} onOpenChange={(next, details) => {
    // Touch taps are handled below; synthetic focus/press must not immediately close them.
    if (touch.current && ["trigger-focus", "trigger-press", "trigger-hover"].includes(details.reason)) return;
    setOpen(next);
  }}><TooltipTrigger render={render ?? <button type="button" />} aria-label={render ? undefined : label} aria-describedby={open ? id : undefined}
    onPointerEnter={(event) => { touch.current = event.pointerType === "touch"; }}
    onPointerDown={(event) => { touch.current = event.pointerType === "touch"; }}
    onPointerLeave={(event) => { if (!hoverable && event.pointerType !== "touch") setOpen(false); }}
    onFocus={() => { if (!touch.current) setOpen(true); }} onBlur={() => setOpen(false)} onClick={() => { if (touch.current) setOpen((value) => !value); }}
    className={className}>{children}</TooltipTrigger><TooltipContent id={id} role="tooltip" side="right" sideOffset={8} collisionPadding={8} collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }} className={`${hoverable ? "pointer-events-auto" : "pointer-events-none"} max-w-[min(18rem,calc(100vw-1rem))] text-pretty leading-relaxed`}>{description}</TooltipContent></Tooltip>;
}
export function StatHelp({ title, children }: { title: string; children: ReactNode }) {
  return <StatTooltip label={title + " 도움말"} description={children} className="inline-flex text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary">{title}</StatTooltip>;
}
export function StatTitle({ title, help }: { title: string; help: ReactNode }) {
  return <StatHelp title={title}>{help}</StatHelp>;
}
