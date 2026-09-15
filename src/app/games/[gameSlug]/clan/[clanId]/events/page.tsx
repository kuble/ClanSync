import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { ClanEventNotifyForm } from "@/components/main-clan/clan-event-notify-form";
import { ClanEventsView } from "@/components/main-clan/clan-events-view";
import {
  clanEventRsvpKey,
  type SerializedClanEvent,
} from "@/lib/clan/expand-clan-event-occurrences";
import { cancelStalePollNotificationLogs } from "@/lib/clan/cancel-stale-poll-notifications";
import { loadSerializedBracketTournaments } from "@/lib/clan/load-bracket-tournaments";
import { loadSerializedClanPolls } from "@/lib/clan/load-clan-polls";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/supabase/request";
import type { Json } from "@/lib/supabase/database.types";
import { Bell, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ClanEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const sp = await searchParams;
  const tab = sp.tab;
  const initialTab: "calendar" | "bracket" | "polls" =
    tab === "polls" || tab === "bracket" || tab === "calendar"
      ? tab
      : "calendar";
  const user = await getRequestUser();
  if (!user) redirect(`/sign-in?next=/games/${gameSlug}/clan/${clanId}/events`);
  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) redirect(`/games/${gameSlug}/clan`);
  await cancelStalePollNotificationLogs();

  const canManage =
    user != null && ctx != null
      ? await hasRequestClanPermission(clanId, "manage_clan_events")
      : false;

  const canEditEventNotify = ctx?.role === "leader";

  const svc = createServiceRoleClient();
  const { data: settingsRow } = await svc
    .from("clan_settings")
    .select("event_notify")
    .eq("clan_id", clanId)
    .maybeSingle();

  const notify = readClanEventNotifySettings(
    settingsRow?.event_notify as Json | null,
  );

  const { data: rows } = await svc
    .from("clan_events")
    .select(
      "id, title, kind, start_at, place, source, repeat, repeat_weekdays, repeat_time",
    )
    .eq("clan_id", clanId)
    .is("cancelled_at", null)
    .order("start_at", { ascending: true })
    .limit(500);

  const events: SerializedClanEvent[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    kind: r.kind as SerializedClanEvent["kind"],
    start_at: r.start_at as string,
    place: (r.place as string | null) ?? null,
    source: r.source as SerializedClanEvent["source"],
    repeat: (r.repeat ?? "none") as SerializedClanEvent["repeat"],
    repeat_weekdays: (r.repeat_weekdays as number[] | null) ?? null,
    repeat_time: (r.repeat_time as string | null) ?? null,
  }));

  const eventIds = events.map((e) => e.id);
  let myRsvpGoingKeys: string[] = [];
  if (user && eventIds.length > 0) {
    const { data: rsvpRows } = await svc
      .from("event_rsvps")
      .select("event_id, instance_idx")
      .eq("user_id", user.id)
      .eq("status", "going")
      .in("event_id", eventIds);
    myRsvpGoingKeys = (rsvpRows ?? []).map((r) =>
      clanEventRsvpKey(r.event_id as string, Number(r.instance_idx)),
    );
  }

  const polls = await loadSerializedClanPolls(clanId, user?.id ?? null);
  const bracketTournaments = await loadSerializedBracketTournaments(clanId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">클랜 이벤트</h2>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          함께할 다음 약속. 클랜 일정과 투표, 대회를 한곳에서 관리하세요.
        </p>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <CalendarDays
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p>
          스크림이 확정되면 일정이 자동으로 등록됩니다. 변경·취소도 함께
          반영되므로 다시 등록할 필요가 없습니다.
        </p>
      </div>

      <ClanEventsView
        gameSlug={gameSlug}
        clanId={clanId}
        events={events}
        canManageEvents={canManage}
        planIsPremium={ctx?.plan === "premium"}
        viewerUserId={user?.id ?? null}
        myRsvpGoingKeys={myRsvpGoingKeys}
        polls={polls}
        bracketTournaments={bracketTournaments}
        initialTab={initialTab}
      />
      {canManage ? (
        <details className="rounded-xl border bg-card px-4 py-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring">
            <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
            외부 채널 알림 설정
          </summary>
          <div className="mt-4">
            <ClanEventNotifyForm
              gameSlug={gameSlug}
              clanId={clanId}
              discordEnabled={notify.discord_enabled}
              discordWebhookUrl={notify.discord_webhook_url}
              kakaoNotificationsOptIn={notify.kakao_notifications_opt_in}
              canEdit={canEditEventNotify}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
