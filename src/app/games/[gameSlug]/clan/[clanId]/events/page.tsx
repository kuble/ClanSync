import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { ClanEventNotifyForm } from "@/components/main-clan/clan-event-notify-form";
import { ClanEventsView } from "@/components/main-clan/clan-events-view";
import {
  clanEventRsvpKey,
  type SerializedClanEvent,
} from "@/lib/clan/expand-clan-event-occurrences";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export default async function ClanEventsPage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx =
    user != null
      ? await loadMainClanContext(supabase, user.id, gameSlug, clanId)
      : null;

  const canManage =
    user != null && ctx != null
      ? await hasClanPermission(
          supabase,
          user.id,
          clanId,
          "manage_clan_events",
        )
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 이벤트</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          캘린더·대진표·투표 상단 탭으로 전환합니다. 스크림·매칭에서 일정이
          확정되면 클랜 이벤트에 자동 등록되는 흐름은 D-EVENTS-01 을
          따릅니다.
        </p>
      </div>

      {canManage ? (
        <ClanEventNotifyForm
          gameSlug={gameSlug}
          clanId={clanId}
          discordEnabled={notify.discord_enabled}
          discordWebhookUrl={notify.discord_webhook_url}
          canEdit={canEditEventNotify}
        />
      ) : null}

      <ClanEventsView
        gameSlug={gameSlug}
        clanId={clanId}
        events={events}
        canManageEvents={canManage}
        planIsPremium={ctx?.plan === "premium"}
        viewerUserId={user?.id ?? null}
        myRsvpGoingKeys={myRsvpGoingKeys}
      />
    </div>
  );
}
