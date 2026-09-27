import { createClient } from "@/lib/supabase/server";
import { loadClanStatsDetail } from "@/lib/clan/stats/load-clan-stats";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const { clanId } = await params;
  const query = new URL(request.url).searchParams;
  const section = query.get("section"), personId = query.get("userId");
  if (!uuid.test(clanId) || (section !== "archive" && section !== "personal") || (section === "personal" && (!personId || !uuid.test(personId)))) {
    return Response.json({ error: "잘못된 통계 요청입니다." }, { status: 400, headers });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers });
  const detail = await loadClanStatsDetail(supabase, user.id, clanId, section === "personal" ? personId! : undefined);
  if (!detail) return Response.json({ error: "기록을 볼 수 있는 권한이 없습니다." }, { status: 403, headers });
  return Response.json(detail, { headers });
}
