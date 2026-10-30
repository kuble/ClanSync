"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SheetClose } from "@/components/ui/sheet";
import type { ClanInAppNotificationVM } from "@/lib/clan/load-clan-inapp-notifications";
import type { Json } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { uuidPattern } from "@/lib/clan/board";

function NotificationLink({ href, inSheet, className, children }: { href: string; inSheet: boolean; className: string; children: ReactNode }) {
  return inSheet ? <SheetClose nativeButton={false} render={<Link href={href} className={className} />}>{children}</SheetClose> : <Link href={href} className={className}>{children}</Link>;
}
function formatRelativeKo(iso: string, now?: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = (now ?? Date.now()) - t;
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slotKindLabel(slot: string | undefined): string {
  if (!slot) return "투표";
  const map: Record<string, string> = {
    lfg_post_expired: "LFG 마감(작성)",
    lfg_application_expired: "LFG 마감(신청)",
    poll_created: "투표 생성",
    poll_daily: "투표 알림(매일)",
    poll_weekly: "투표 알림(매주)",
    poll_deadline_window: "마감 임박",
    poll_deadline_1h: "마감 1시간 전",
    event_t_minus_24h: "일정 24시간 전",
    event_t_minus_1h: "일정 1시간 전",
    event_t_minus_10min: "일정 10분 전",
    event_t_0: "일정 시작",
    event_cancelled: "일정 취소",
  };
  return map[slot] ?? slot;
}

function notificationTitle(
  kind: string,
  payload: Json,
): { title: string; href: string | null } {
  const base = (g: string, h: string | null) => ({ title: g, href: h });
  if((kind==="coaching_requested"||kind==="coaching_comment")&&payload&&typeof payload==='object'&&!Array.isArray(payload)){
    const title=typeof payload.post_title==='string'?payload.post_title:'리플레이 피드백';
    return base((kind==="coaching_requested"?'새 코칭 신청':'코칭 댓글')+' · '+title,null);
  }

  if (kind === "poll_reminder" && payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const title =
      typeof p.poll_title === "string" && p.poll_title.trim()
        ? p.poll_title
        : "클랜 투표";
    const slot =
      typeof p.slot_kind === "string" ? p.slot_kind : undefined;
    return base(`${slotKindLabel(slot)} · ${title}`, null);
  }

  if (
    (kind === "lfg_post_expired" || kind === "lfg_application_expired")
    && payload
    && typeof payload === "object"
  ) {
    const p = payload as Record<string, unknown>;
    const mode = typeof p.mode === "string" && p.mode.trim() ? p.mode.trim() : "LFG";
    const slotRaw = typeof p.slot_kind === "string" ? p.slot_kind : undefined;
    const line =
      kind === "lfg_post_expired" ? `${mode} 모집이 마감되었습니다.` : `${mode} 모집 신청이 만료 처리되었습니다.`;
    return base(`${slotKindLabel(slotRaw)} · ${line}`, null);
  }

  if (kind === "event_reminder" && payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const title =
      typeof p.event_title === "string" && p.event_title.trim()
        ? p.event_title
        : "클랜 일정";
    const slot =
      typeof p.slot_kind === "string" ? p.slot_kind : undefined;
    return base(`${slotKindLabel(slot)} · ${title}`, null);
  }

  return base("알림", null);
}


export function ClanNotificationList({ items, eventsBase, inSheet = false, now }: {
  items: ClanInAppNotificationVM[]; eventsBase: string; inSheet?: boolean; now?: number;
}) {
  return <>{items.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              알림이 없습니다.
            </p>
          ) : (
            <ul
              className="divide-border max-h-[min(70vh,520px)] divide-y overflow-y-auto overscroll-contain px-2 py-1"
              role="list"
            >
              {items.map((row) => {
                const { title } = notificationTitle(row.kind, row.payload);
                const unread = row.read_at == null;
                const p =
                  row.payload && typeof row.payload === "object"
                    ? (row.payload as Record<string, unknown>)
                    : {};
                const pollId = typeof p.poll_id === "string" ? p.poll_id : undefined;
                const gameSlug = typeof p.game_slug === "string" ? p.game_slug : "";
                const isLfgExpire =
                  row.kind === "lfg_post_expired" || row.kind === "lfg_application_expired";
                let href =
                  row.kind === "poll_reminder" && pollId
                    ? `${eventsBase}?tab=polls`
                    : row.kind === "event_reminder"
                      ? `${eventsBase}?tab=calendar`
                      : eventsBase;

                if (isLfgExpire && gameSlug) {
                  href = `/games/${encodeURIComponent(gameSlug)}?tab=lfg`;
                }
                if((row.kind==='coaching_requested'||row.kind==='coaching_comment')&&typeof p.post_id==='string'&&uuidPattern.test(p.post_id)){
                  href=eventsBase.replace(/\/events$/,'')+'/board/feedback/'+p.post_id+(row.kind==='coaching_comment'?'#comments':'');
                }

                return (
                  <li key={row.id} className="py-0.5">
                    <NotificationLink href={href} inSheet={inSheet} className={cn("hover:bg-muted/60 block rounded-md px-2 py-2.5 transition-colors", unread && "bg-primary/5")}>
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          unread ? "font-medium" : "font-normal text-muted-foreground",
                        )}
                      >
                        {title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatRelativeKo(row.created_at, now)}
                        {unread ? " · 미읽음" : ""}
                      </p>
                      <span className="text-primary mt-1 inline-block text-xs font-medium">
                        원본 보기 →
                      </span>
                    </NotificationLink>
                  </li>
                );
              })}
            </ul>
          )}</>;
}
