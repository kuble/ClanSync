"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, MessagesSquare, Video, Radio, Camera, Check, ChevronDown } from "lucide-react";
import { BOARD_SECTIONS } from "@/lib/clan/board";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ClanSectionLinks } from "./clan-section-links";
const icons = { notices: Megaphone, free: MessagesSquare, feedback: Video, channels: Radio, memories: Camera };
function subscribeDesktop(notify: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const desktopSnapshot = () => window.matchMedia("(min-width: 768px)").matches;
export function ClanBoardNavigation({ base }: { base: string }) {
  const pathname = usePathname();
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const current = BOARD_SECTIONS.find((section) => pathname === `${base}/${section.key}` || pathname.startsWith(`${base}/${section.key}/`)) ?? BOARD_SECTIONS[0];
  const CurrentIcon = icons[current.key];
  const items = BOARD_SECTIONS.map(({ key, label, description }) => {
    const Icon = icons[key];
    return { label, description, href: `${base}/${key}`, selected: current.key === key, icon: <Icon className="size-4 shrink-0" aria-hidden /> };
  });
  return <>
    <nav aria-label="게시판 목차" className="min-w-0 md:hidden">
      <DropdownMenu key={desktop ? "desktop" : "mobile"}>
        <DropdownMenuTrigger render={<Button variant="outline" className="min-h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm"/>} aria-label={`게시판 선택: ${current.label}`}>
          <CurrentIcon className="size-4 text-primary" aria-hidden/><span>{current.label}</span><ChevronDown className="ml-auto size-4 text-muted-foreground" aria-hidden/>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} aria-label="게시판 선택" className="md:hidden">
          {items.map(item => <DropdownMenuItem key={item.href} render={<Link href={item.href} scroll={false} prefetch={false}/>} aria-current={item.selected ? "page" : undefined} className={`min-h-11 gap-3 px-3 text-[13px] ${item.selected ? "bg-primary/10 font-semibold text-primary" : ""}`}>
            {item.icon}<span>{item.label}</span>{item.selected && <Check className="ml-auto size-4" aria-hidden/>}
          </DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
    <div className="hidden min-w-0 md:block"><ClanSectionLinks label="게시판 목차" items={items}/></div>
  </>;
}
