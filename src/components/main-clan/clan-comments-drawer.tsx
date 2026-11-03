"use client";
import type { ReactNode, RefObject } from "react";
import { MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function ClanCommentsDrawer({ open, onOpenChange, title, label, action, children, id, finalFocus }: {
  open: boolean; onOpenChange?: (open: boolean) => void; title: string; label: string;
  action: ReactNode; children: ReactNode; id?: string; finalFocus?: RefObject<HTMLButtonElement | null>;
}) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent keepMounted id={id} finalFocus={finalFocus} aria-label={label + " " + title} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
      <SheetHeader className="shrink-0 border-b pr-12">
        <div className="flex items-center justify-between gap-3"><SheetTitle className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" aria-hidden /><span className="sr-only">{label} </span>{title}</SheetTitle>{action}</div>
        <SheetDescription>{label}</SheetDescription>
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>;
}
