import { createClient } from "@/lib/supabase/server";
import { loadClanStatsDetail, loadClanStatsArchive, loadClanStatsPeriod } from "@/lib/clan/stats/load-clan-stats";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const { clanId } = await params;
  const query = new URL(request.url).searchParams;
  const section = query.get("section"), personId = query.get("userId");
  const period = query.get("period"), day = query.get("day");
  const validDay = (value: string) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const validPeriod = period === "all" || !!period && (/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(period) || validDay(period));
  if (!uuid.test(clanId) || !["archive", "personal", "period"].includes(section ?? "") || (section === "personal" && (!personId || !uuid.test(personId))) || (section === "period" && !validPeriod) || (day !== null && !validDay(day))) {
    return Response.json({ error: "잘못된 통계 요청입니다." }, { status: 400, headers });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers });
  const detail = section === "period" ? await loadClanStatsPeriod(supabase, clanId, period!)
    : section === "archive" ? await loadClanStatsArchive(supabase, clanId, day ?? undefined)
      : await loadClanStatsDetail(supabase, user.id, clanId, personId!);
  if (!detail) return Response.json({ error: "기록을 볼 수 있는 권한이 없습니다." }, { status: 403, headers });
  return Response.json(detail, { headers });
}
