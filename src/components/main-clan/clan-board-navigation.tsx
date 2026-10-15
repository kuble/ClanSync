"use client";
import { usePathname } from "next/navigation";
import { Megaphone, MessagesSquare, Video, Radio, Camera } from "lucide-react";
import { BOARD_SECTIONS } from "@/lib/clan/board";
import { ClanSectionLinks } from "./clan-section-links";
const icons = { notices: Megaphone, free: MessagesSquare, feedback: Video, channels: Radio, memories: Camera };
export function ClanBoardNavigation({ base }: { base: string }) {
  const pathname = usePathname();
  const selected = BOARD_SECTIONS.find((section) => pathname === `${base}/${section.key}` || pathname.startsWith(`${base}/${section.key}/`))?.key ?? "notices";
  return <ClanSectionLinks label="게시판 목차" items={BOARD_SECTIONS.map(({ key, label, description }) => {
    const Icon = icons[key];
    return { label, description, href: `${base}/${key}`, selected: selected === key, icon: <Icon className="size-4 shrink-0" aria-hidden /> };
  })} />;
}
