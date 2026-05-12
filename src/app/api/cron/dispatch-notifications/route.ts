import { NextResponse } from "next/server";
import { dispatchDiscordPollNotifications } from "@/lib/notifications/dispatch-discord-poll-notifications";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * LFG 만료 정리(notification_log 적재 포함) 후 due in-app(notification_log→notifications) 디스패치,
 * Discord 투표 알림 웹훅 순서 처리.
 * Vercel Cron(Hobby: 하루 1회) 또는 수동 호출 시 `Authorization: Bearer <CRON_SECRET>` 필요.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 8) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceRoleClient();

  let lfg_expired = 0;
  let lfg_note: string | null = null;
  try {
    const { data: lfgRaw, error: lfgErr } = await svc.rpc("expire_open_lfg_posts_batch", {
      p_limit: 200,
    });
    if (lfgErr) {
      lfg_note = lfgErr.message;
    } else {
      lfg_expired = typeof lfgRaw === "number" ? lfgRaw : Number(lfgRaw);
    }
  } catch (e) {
    lfg_note = e instanceof Error ? e.message : "lfg_expire_failed";
  }

  const { data, error } = await svc.rpc("dispatch_inapp_notification_batch", {
    p_limit: 150,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        lfg_expired,
        lfg_note,
      },
      { status: 500 },
    );
  }

  const dispatched = typeof data === "number" ? data : Number(data);

  let discord: { claimed: number; sent: number; failed: number } = {
    claimed: 0,
    sent: 0,
    failed: 0,
  };
  let discord_note: string | null = null;
  try {
    discord = await dispatchDiscordPollNotifications(svc, 40);
  } catch (e) {
    discord_note = e instanceof Error ? e.message : "discord_dispatch_failed";
  }

  return NextResponse.json({
    ok: true,
    dispatched,
    discord,
    discord_note,
    lfg_expired,
    lfg_note,
  });
}
