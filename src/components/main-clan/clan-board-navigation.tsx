"use client";
import { useTranslator } from "#use-translator";
import { usePathname } from "next/navigation";
import { Megaphone, MessagesSquare, Video, Radio, Camera } from "lucide-react";
import { BOARD_SECTIONS } from "@/lib/clan/board";
import { ClanSectionLinks } from "./clan-section-links";
const icons = { notices: Megaphone, free: MessagesSquare, feedback: Video, channels: Radio, memories: Camera };
export function ClanBoardNavigation({ base }: { base: string }) {
  const tx = useTranslator();
  const pathname = usePathname();
  const current = BOARD_SECTIONS.find((section) => pathname === `${base}/${section.key}` || pathname.startsWith(`${base}/${section.key}/`)) ?? BOARD_SECTIONS[0];
  const items = BOARD_SECTIONS.map(({ key, label, description }) => {
    const Icon = icons[key];
    return { label, description, href: `${base}/${key}`, selected: current.key === key, icon: <Icon className="size-4 shrink-0" aria-hidden /> };
  });
  return <ClanSectionLinks wrap label={tx("게시판 목차")} selectionLabel={tx("게시판 선택")} items={items}/>;
}
