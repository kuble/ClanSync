"use client";
import { useTranslator } from "#use-translator";
import type { ReactNode, RefObject } from "react";
import { MessageSquare, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function ClanCommentsDrawer({ open, onOpenChange, title, label, icon: Icon = MessageSquare, action, children, id, finalFocus }: {
  open: boolean; onOpenChange?: (open: boolean) => void; title: string; label: string;
  icon?: LucideIcon; action?: ReactNode; children: ReactNode; id?: string; finalFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const tx = useTranslator();
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent keepMounted id={id} finalFocus={finalFocus} showCloseButton={false}
      onBackdropPointerMove={event => { if (open && event.pointerType === "mouse" && !event.buttons) onOpenChange?.(false); }}
      aria-label={label + " " + title} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
      <SheetHeader className="shrink-0 border-b">
        <div className="flex items-center justify-between gap-3">
          <SheetTitle className="flex items-center gap-2"><Icon className="size-4 text-primary" aria-hidden /><span className="sr-only">{tx(label)} </span>{title}</SheetTitle>
          <div className="flex shrink-0 items-center gap-1">
            {action}
            <SheetClose render={<Button variant="ghost" size="icon-sm" />} aria-label={tx("닫기")}><X aria-hidden /></SheetClose>
          </div>
        </div>
        <SheetDescription>{tx(label)}</SheetDescription>
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>;
}
