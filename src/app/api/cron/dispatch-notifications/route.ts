import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * `notification_log` 중 due 인 in-app 행을 처리해 `notifications` 피드에 넣고 sent 로 표시한다.
 * Vercel Cron 또는 수동 호출 시 `Authorization: Bearer <CRON_SECRET>` 필요.
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
  const { data, error } = await svc.rpc("dispatch_inapp_notification_batch", {
    p_limit: 150,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const dispatched = typeof data === "number" ? data : Number(data);
  return NextResponse.json({
    ok: true,
    dispatched,
  });
}
