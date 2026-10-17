"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, ChevronDown, Megaphone, Swords, Vote } from "lucide-react";
import { BrandSymbol } from "@/components/ui/brand-logo";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildDiscordNotificationCard, type DiscordNotificationRow } from "@/lib/notifications/discord-message";

const benefits = [
  { id: "room", icon: Swords, title: "내전 링크, 매번 공유하지 않아도", description: "정규·깜짝 내전을 구분해 예약은 시작 10분 전, 바로 열면 시작 알림을 보냅니다. 링크를 누르면 해당 내전으로 연결돼요.", channel: "내전-알림", screen: "내전 화면", image: "balance" },
  { id: "calendar", icon: CalendarDays, title: "함께할 일정을 놓치지 않도록", description: "등록한 일정마다 원하는 알림 시점을 선택하세요. 반복 일정도 같은 시간에 알려줍니다.", channel: "일정-알림", screen: "캘린더 화면", image: "calendar" },
  { id: "notice", icon: Megaphone, title: "새 공지가 채팅에 묻히지 않게", description: "새 공지의 제목과 본문을 Discord에도 전달합니다. 링크를 누르면 해당 공지를 열 수 있어요.", channel: "클랜-공지", screen: "공지 화면", image: "notices" },
  { id: "poll", icon: Vote, title: "투표 시작부터 결과까지", description: "참여할 때와 결과를 확인할 때, 각각 한 번씩. 시작·종료 알림은 따로 켜고 끌 수 있습니다.", channel: "일정-알림", screen: "투표 화면", image: "polls" },
] as const;

const example: DiscordNotificationRow = { log_id: "example", event_id: null, poll_id: null, title: "", slot_kind: "", start_at: null, deadline_at: null, game_slug: "overwatch", clan_id: "example", channel_id: "example" };
const samples: DiscordNotificationRow[] = [
  { ...example, room_id: "example", room_kind: "regular", room_status: "scheduled", title: "토요일 정규 내전", slot_kind: "room_t_minus_10min", start_at: "2026-10-12T10:10:00Z" },
  { ...example, event_id: "example", title: "수요 듀오 연습회", slot_kind: "event_t_minus_1h", start_at: "2026-10-12T11:00:00Z" },
  { ...example, notice_id: "example", title: "이번 주 내전 운영 안내", slot_kind: "notice_created", notice_content: "토요일 21시에 정규 내전이 열립니다.\n시작 10분 전에 입장 링크가 올라와요. 참가하실 분은 미리 참석 응답을 남겨 주세요." },
  { ...example, poll_id: "example", title: "다음 내전 시간", slot_kind: "poll_ended", deadline_at: "2026-10-12T12:00:00Z" },
];

function Preview({ index }: { index: number }) {
  const item = benefits[index];
  const [open, setOpen] = useState(false);
  const [pollEnded, setPollEnded] = useState(true);
  const card = buildDiscordNotificationCard({ ...samples[index], ...(item.id === "poll" ? { slot_kind: pollEnded ? "poll_ended" : "poll_created" } : {}) }, { siteUrl: "https://clansync.example", now: new Date("2026-10-12T10:00:00Z") });
  return <><div className="overflow-hidden rounded-xl border border-border bg-background" role="region" aria-label={`${item.title} 활용 예시`}>
    <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs"><span className="font-medium text-muted-foreground">#{item.channel}</span><span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">발송 예시</span></div>
    {item.id === "poll" && <div className="flex gap-2 px-4 pt-3">{[{ ended: false, label: "시작 알림" }, { ended: true, label: "종료 알림" }].map(({ ended, label }) => <button key={label} type="button" aria-pressed={pollEnded === ended} onClick={() => setPollEnded(ended)} className={cn("rounded-md px-2.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-ring", pollEnded === ended ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}>{label}</button>)}</div>}
    <div className="flex gap-3 p-4"><span role="img" aria-label="ClanSync 프로필" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background"><BrandSymbol size={22} /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold">ClanSync<span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary">앱</span></p>
        <div className="mt-2 border-l-2 bg-muted/40 p-3" style={{ borderColor: `#${card.color.toString(16)}` }}><p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{card.category}</p><p className="text-[13px] font-semibold leading-relaxed">{card.title}</p><p className="mt-1.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">{card.body}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">{card.action}<ArrowUpRight className="size-3" aria-hidden /></span></div>
      </div>
    </div>
    <div className="border-t border-border"><p className="px-4 py-2 text-[10px] text-muted-foreground">링크를 누르면 · {item.screen}</p><button type="button" aria-label={`${item.screen} 크게 보기`} onClick={() => setOpen(true)} className="relative block w-full focus-visible:outline-2 focus-visible:outline-ring"><Image src={`/images/discord/${item.image}.jpg`} alt={`${item.screen} 서비스 화면 예시`} width={1210} height={756} sizes="(max-width: 640px) 90vw, 600px" className="aspect-[16/10] w-full object-cover object-top" /><span className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground">크게 보기</span></button></div>
  </div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-5xl"><DialogHeader><DialogTitle>{item.screen}</DialogTitle></DialogHeader><Image src={`/images/discord/${item.image}.jpg`} alt={`${item.screen} 서비스 화면 예시 확대`} width={1210} height={756} sizes="90vw" className="max-h-[75dvh] w-full object-contain" /></DialogContent></Dialog></>;
}

export function DiscordBenefitsGallery() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  return <section aria-label="Discord 활용 갤러리" className="space-y-4">
    <div><h4 className="text-sm font-semibold">우리 클랜의 소식을, Discord까지</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">실제 알림과 같은 구성입니다. 제목·내용·시각은 예시이며, 링크를 누르면 해당 화면으로 연결됩니다.</p></div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
      <div className="overflow-hidden rounded-xl border border-border bg-card">{benefits.map((item, index) => <div key={item.id} className="border-b border-border last:border-b-0">
        <button id={`${id}-trigger-${index}`} type="button" aria-expanded={selected === index} aria-controls={`${id}-panel-${index}`} onClick={() => setSelected(index)} className={cn("flex min-h-16 w-full items-center gap-3 px-4 py-4 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", selected === index ? "bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted/40")}>
          <item.icon className={cn("size-4 shrink-0", selected === index && "text-primary")} aria-hidden /><span className="flex-1 leading-relaxed">{item.title}</span><ChevronDown className={cn("size-3.5 shrink-0 transition-transform", selected === index && "rotate-180")} aria-hidden />
        </button>
        <div id={`${id}-panel-${index}`} role="region" aria-labelledby={`${id}-trigger-${index}`} hidden={selected !== index} className="px-4 pb-4"><p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p><div className="mt-4 xl:hidden"><Preview index={index} /></div></div>
      </div>)}</div>
      <div className="hidden xl:block"><Preview index={selected} /></div>
    </div>
  </section>;
}
