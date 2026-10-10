import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { ClanEventNotificationSettings } from "@/components/main-clan/clan-event-notify-form";
import { discordBotConfigured } from "@/lib/notifications/discord-bot";
import { readEventDiscordSettings } from "@/lib/clan/event-discord-settings";
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
import { redirect } from "next/navigation";

export default async function ClanEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ tab?: string; discord?: string }>;
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
  const svc = createServiceRoleClient();
  const pollsPromise = (async () => {
    // Preserve cleanup before reading polls without blocking independent content.
    await cancelStalePollNotificationLogs();
    return loadSerializedClanPolls(clanId, user.id);
  })();
  const eventsPromise = (async () => {
    const { data: rows } = await svc
      .from("clan_events")
      .select(
        "id, title, kind, start_at, place, source, repeat, repeat_weekdays, repeat_time, discord_notify",
      )
      .eq("clan_id", clanId)
      .is("cancelled_at", null)
      .order("start_at", { ascending: true })
      .limit(500);

    const events: SerializedClanEvent[] = (rows ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      kind: event.kind as SerializedClanEvent["kind"],
      start_at: event.start_at,
      place: event.place ?? null,
      source: event.source as SerializedClanEvent["source"],
      repeat: event.repeat ?? "none",
      repeat_weekdays: event.repeat_weekdays ?? null,
      repeat_time: event.repeat_time ?? null,
      discord_notify: readEventDiscordSettings(event.discord_notify),
    }));
    const eventIds = events.map((event) => event.id);
    const { data: rsvpRows } =
      eventIds.length > 0
        ? await svc
            .from("event_rsvps")
            .select("event_id, instance_idx")
            .eq("user_id", user.id)
            .eq("status", "going")
            .in("event_id", eventIds)
        : { data: [] };
    return {
      events,
      myRsvpGoingKeys: (rsvpRows ?? []).map((rsvp) =>
        clanEventRsvpKey(rsvp.event_id, rsvp.instance_idx),
      ),
    };
  })();

  const [
    canManage,
    { data: settingsRow },
    { events, myRsvpGoingKeys },
    polls,
    bracketTournaments,
  ] = await Promise.all([
    hasRequestClanPermission(clanId, "manage_clan_events"),
    svc
      .from("clan_settings")
      .select("event_notify")
      .eq("clan_id", clanId)
      .maybeSingle(),
    eventsPromise,
    pollsPromise,
    loadSerializedBracketTournaments(clanId),
  ]);
  const canEditEventNotify = ctx.role === "leader";
  const notify = readClanEventNotifySettings(
    settingsRow?.event_notify as Json | null,
  );
  const canOpenSettings = canManage || canEditEventNotify;
  const { data: connection } = canOpenSettings ? await svc.from("clan_discord_connections")
    .select("guild_name,channel_id,channel_name").eq("clan_id", clanId).maybeSingle() : { data: null };
  const botConfigured = discordBotConfigured();

  return (
    <div className="space-y-5">
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
        discordAvailable={botConfigured && notify.discord_enabled && !!connection?.channel_id && ctx.plan === "premium"}
        discordChannelName={connection?.channel_name}
        notificationSettings={canOpenSettings ? <ClanEventNotificationSettings gameSlug={gameSlug} clanId={clanId}
          discordEnabled={notify.discord_enabled} kakaoNotificationsOptIn={notify.kakao_notifications_opt_in}
          canEdit={canEditEventNotify} premium={ctx.plan === "premium"} botConfigured={botConfigured}
          connection={connection} connectionResult={sp.discord} /> : undefined}
      />
    </div>
  );
}
