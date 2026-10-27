import { createClient } from "@/lib/supabase/server";
import { loadPlayerIdentity } from "@/lib/profile/load-player-identity";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(userId)) return Response.json({ error: "잘못된 플레이어입니다." }, { status: 400, headers });
  const clanId = new URL(request.url).searchParams.get("clanId") ?? undefined;
  if (clanId !== undefined && !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(clanId)) return Response.json({ error: "잘못된 클랜입니다." }, { status: 400, headers });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401, headers });
  try {
    const profile = await loadPlayerIdentity(db, userId, clanId, user.id);
    return profile ? Response.json({ profile }, { headers }) : Response.json({ error: "존재하지 않는 플레이어입니다." }, { status: 404, headers });
  } catch {
    return Response.json({ error: "플레이어 소개를 불러오지 못했습니다." }, { status: 500, headers });
  }
}
