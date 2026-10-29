import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/clan/board";
import { loadProfilePersonalEmblemCase } from "@/lib/personal-emblems/load-profile-case";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("player");
  if (!userId || !uuidPattern.test(userId)) return Response.json({ ok: false, error: "플레이어 정보를 확인해 주십시오." }, { status: 400, headers });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401, headers });
  try {
    const collection = await loadProfilePersonalEmblemCase(client, userId);
    return collection ? Response.json({ ok: true, collection }, { headers })
      : Response.json({ ok: false, error: "이 플레이어의 대표 엠블럼을 볼 수 없습니다." }, { status: 403, headers });
  } catch {
    return Response.json({ ok: false, error: "대표 엠블럼을 불러오지 못했습니다." }, { status: 500, headers });
  }
}
