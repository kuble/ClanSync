import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/clan/board";
import { loadClanPersonalEmblemCollection } from "@/lib/clan/stats/load-clan-stats";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: { params: Promise<{ clanId: string }> }) {
  const { clanId } = await params;
  const personId = new URL(request.url).searchParams.get("player");
  if (!uuidPattern.test(clanId) || (personId !== null && !uuidPattern.test(personId)))
    return Response.json({ ok: false, error: "클랜과 멤버 정보를 확인해 주세요." }, { status: 400, headers });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401, headers });
  try {
    const collection = await loadClanPersonalEmblemCollection(supabase, user.id, clanId, personId ?? user.id);
    return collection ? Response.json({ ok: true, collection }, { headers })
      : Response.json({ ok: false, error: "이 멤버의 엠블럼을 볼 수 없습니다." }, { status: 403, headers });
  } catch {
    return Response.json({ ok: false, error: "엠블럼을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers });
  }
}
