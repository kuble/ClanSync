"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  markAllClanInAppNotificationsReadAction,
  markInAppNotificationIdsReadAction,
} from "@/app/actions/clan-inapp-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ClanInAppNotificationVM } from "@/lib/clan/load-clan-inapp-notifications";
import type { Json } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

function formatRelativeKo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
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

  return base("알림", null);
}

export function ClanInAppNotificationBell({
  gameSlug,
  clanId,
  initialItems,
  initialUnreadCount,
}: {
  gameSlug: string;
  clanId: string;
  initialItems: ClanInAppNotificationVM[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [badgeHidden, setBadgeHidden] = useState(false);

  useEffect(() => {
    setBadgeHidden(false);
  }, [initialUnreadCount]);

  const eventsBase = `/games/${encodeURIComponent(gameSlug)}/clan/${clanId}/events`;

  /** 열 때 revalidate(읽음 RPC)가 오픈 직후와 겹치면 Dialog 팝업이 뜨지 않을 수 있어, 읽음 처리는 닫을 때만 수행. */
  const onOpenChange = (next: boolean) => {
    if (next) {
      const unreadIds = initialItems
        .filter((i) => i.read_at == null)
        .map((i) => i.id);
      if (unreadIds.length > 0) setBadgeHidden(true);
      return;
    }
    const unreadIds = initialItems
      .filter((i) => i.read_at == null)
      .map((i) => i.id);
    if (unreadIds.length > 0) {
      startTransition(() => {
        void (async () => {
          try {
            await markInAppNotificationIdsReadAction(
              gameSlug,
              clanId,
              unreadIds,
            );
          } catch {
            /* 읽음 처리 실패는 배지·다음 새로고침에 맡김 */
          }
        })();
      });
    }
    router.refresh();
  };

  const onMarkAll = () => {
    startTransition(() => {
      void (async () => {
        try {
          await markAllClanInAppNotificationsReadAction(gameSlug, clanId);
          setBadgeHidden(true);
        } finally {
          router.refresh();
        }
      })();
    });
  };

  const showBadge =
    !badgeHidden && initialUnreadCount > 0 ? initialUnreadCount : 0;
  const badgeText = showBadge > 99 ? "99+" : String(showBadge);

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger
        type="button"
        className={cn(
          "hover:bg-muted/80 text-muted-foreground hover:text-foreground relative inline-flex size-9 items-center justify-center rounded-md transition-colors",
          "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
        aria-label={`알림${showBadge ? ` ${badgeText}건 미읽음` : ""}`}
      >
        <Bell className="size-5" aria-hidden />
        {showBadge > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 justify-center px-1 text-[0.65rem] font-semibold"
          >
            {badgeText}
          </Badge>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="right"
        data-testid="clansync-inapp-notification-sheet"
        className="flex w-[min(100vw-2rem,380px)] flex-col gap-0 p-0"
      >
        <SheetHeader className="border-border shrink-0 space-y-1 border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">알림</SheetTitle>
          <p className="text-muted-foreground text-xs font-normal">
            이 클랜에 대한 소식입니다. 브라우저 푸시는 이후 지원 예정(D-NOTIF-02).
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {initialItems.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              알림이 없습니다.
            </p>
          ) : (
            <ul
              className="divide-border max-h-[min(70vh,520px)] divide-y overflow-y-auto overscroll-contain px-2 py-1"
              role="list"
            >
              {initialItems.map((row) => {
                const { title } = notificationTitle(row.kind, row.payload);
                const unread = row.read_at == null;
                const ph =
                  row.payload &&
                  typeof row.payload === "object" &&
                  "poll_id" in row.payload
                    ? (row.payload as { poll_id?: string }).poll_id
                    : undefined;
                const href =
                  row.kind === "poll_reminder" && ph
                    ? `${eventsBase}?tab=polls`
                    : eventsBase;

                return (
                  <li key={row.id} className="py-0.5">
                    <SheetClose
                      nativeButton={false}
                      render={
                        <Link
                          href={href}
                          className={cn(
                            "hover:bg-muted/60 block rounded-md px-2 py-2.5 transition-colors",
                            unread && "bg-primary/5",
                          )}
                        />
                      }
                    >
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          unread ? "font-medium" : "font-normal text-muted-foreground",
                        )}
                      >
                        {title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatRelativeKo(row.created_at)}
                        {unread ? " · 미읽음" : ""}
                      </p>
                      <span className="text-primary mt-1 inline-block text-xs font-medium">
                        원본 보기 →
                      </span>
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-border shrink-0 space-y-2 border-t p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={pending || initialUnreadCount === 0}
            onClick={onMarkAll}
          >
            모두 읽음
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
