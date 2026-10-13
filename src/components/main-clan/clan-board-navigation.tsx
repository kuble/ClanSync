"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Megaphone,MessagesSquare,Video,Radio,Camera } from "lucide-react";
import { BOARD_SECTIONS } from "@/lib/clan/board";
import { cn } from "@/lib/utils";
const icons = {notices:Megaphone,free:MessagesSquare,feedback:Video,channels:Radio,memories:Camera};
export function ClanBoardNavigation({ base }: {base:string}) {
  const pathname=usePathname(),router=useRouter();
  const selected=BOARD_SECTIONS.find(s=>pathname===base+"/"+s.key || pathname.startsWith(base+"/"+s.key+"/"))?.key ?? "notices";
  return <>
    <label className="block space-y-2 lg:hidden"><span className="text-xs text-muted-foreground">게시판 공간</span><select aria-label="게시판 공간" value={selected} onChange={e=>router.push(base+"/"+e.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm">{BOARD_SECTIONS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
    <nav aria-label="게시판 목차" className="hidden space-y-1 rounded-xl border border-border bg-card p-3 lg:sticky lg:top-20 lg:block">
      {BOARD_SECTIONS.map(s=>{const Icon=icons[s.key];return <Link key={s.key} href={base+"/"+s.key} prefetch={false} aria-current={selected===s.key?"page":undefined} className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-muted",selected===s.key?"bg-primary/10 text-primary":"text-muted-foreground")}><Icon className="size-4 shrink-0" aria-hidden/><span>{s.label}</span></Link>;})}
    </nav>
  </>;
}
