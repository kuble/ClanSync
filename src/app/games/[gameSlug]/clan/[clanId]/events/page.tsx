import { readClanEventNotifySettings } from "@/lib/clan/event-notify-settings";
import { ClanEventNotifyForm } from "@/components/main-clan/clan-event-notify-form";
import { CreateClanEventForm } from "@/components/main-clan/create-clan-event-form";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function kindLabel(kind: string): string {
  if (kind === "intra") return "내전";
  if (kind === "scrim") return "스크림";
  return "이벤트";
}

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
    .select("id, title, kind, start_at, place")
    .eq("clan_id", clanId)
    .is("cancelled_at", null)
    .order("start_at", { ascending: true })
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">이벤트</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          단발 일정(M6b MVP). 반복·RSVP·실알림 전송은 후속에서 연결합니다.
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

      {canManage ? (
        <CreateClanEventForm gameSlug={gameSlug} clanId={clanId} />
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">다가오는 일정</h3>
        {!rows?.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            등록된 일정이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((ev) => (
              <li
                key={ev.id}
                className="bg-card rounded-lg border px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{ev.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {kindLabel(ev.kind as string)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(ev.start_at as string).toLocaleString("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {ev.place ? ` · ${ev.place}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
