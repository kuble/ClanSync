"use client";
import { useTranslator } from "#use-translator";
import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
function subscribeDesktop(notify: () => void) {
  const media = window.matchMedia("(min-width: 960px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const desktopSnapshot = () => window.matchMedia("(min-width: 960px)").matches;
type Item = { label: string; icon?: ReactNode; badge?: ReactNode; href?: string; selected: boolean; onSelect?: () => void };
export function ClanSectionPicker({label, selectionLabel = label, items, children, disabled = false}: {
  label: string; selectionLabel?: string; items: Item[]; children: ReactNode; disabled?: boolean;
}) {
  const tx = useTranslator();
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const current = items.find(item => item.selected) ?? items[0];
  if (!current) return null;
  return <>
    <nav aria-label={tx(label)} className="min-w-0 min-[960px]:hidden">
      <DropdownMenu key={desktop ? "desktop" : "mobile"}>
        <DropdownMenuTrigger disabled={disabled} render={<Button variant="outline" className="min-h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm"/>} aria-label={`${tx(selectionLabel)}: ${tx(current.label)}`}>
          {current.icon}<span>{tx(current.label)}</span><ChevronDown className="ml-auto size-4 text-muted-foreground" aria-hidden/>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} aria-label={tx(selectionLabel)} className="max-w-[calc(100vw-1rem)] min-[960px]:hidden">
          {items.map(item => <DropdownMenuItem key={item.label} onClick={item.onSelect} render={item.href ? <Link href={item.href} scroll={false} prefetch={false}/> : undefined} aria-current={item.selected ? "page" : undefined} className={`min-h-11 gap-3 px-3 text-[13px] ${item.selected ? "bg-primary/10 font-semibold text-primary" : ""}`}>
            {item.icon}<span>{tx(item.label)}</span>{item.badge}{item.selected && <Check className="ml-auto size-4" aria-hidden/>}
          </DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
    <div className="hidden min-w-0 min-[960px]:block">{children}</div>
  </>;
}
