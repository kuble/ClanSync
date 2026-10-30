"use client";

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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ClanInAppNotificationVM } from "@/lib/clan/load-clan-inapp-notifications";
import { cn } from "@/lib/utils";
import {createClient} from "@/lib/supabase/client";
import { ClanNotificationList } from "./clan-notification-list";

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
  const signature=initialItems.map(i=>i.id+':'+(i.read_at??'')).join('|');
  useEffect(()=>{
    const client=createClient();let stopped=false,busy=false;
    async function check(){
      if(document.hidden||busy)return;busy=true;
      try{
        const rows=await client.from('notifications').select('id,read_at').or(`clan_id.eq.${clanId},clan_id.is.null`).order('created_at',{ascending:false}).limit(30);
        if(!stopped&&!rows.error&&rows.data.map(i=>i.id+':'+(i.read_at??'')).join('|')!==signature)router.refresh();
      }catch{/* Retry on the next poll without interrupting the current page. */}finally{busy=false;}
    }
    const timer=window.setInterval(check,30_000);
    document.addEventListener('visibilitychange',check);
    return ()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',check);};
  },[clanId,router,signature]);

  useEffect(() => {
    setBadgeHidden(false);
  }, [initialUnreadCount]);

  const eventsBase = `/games/${encodeURIComponent(gameSlug)}/clan/${clanId}/events`;

  /** 열 때 revalidate(읽음 RPC)가 오픈 직후와 겹치면 Dialog 팝업이 뜨지 않을 수 있어, 읽음 처리는 닫을 때만 수행. */
  const onOpenChange = (next: boolean) => {
    if (next) {
      router.refresh();
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
            클랜 소식과 게임 허브(LFG 등) 알림을 함께 보여 줍니다. 브라우저 푸시는 이후 예정(D-NOTIF-02).
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <ClanNotificationList items={initialItems} eventsBase={eventsBase} inSheet />
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
