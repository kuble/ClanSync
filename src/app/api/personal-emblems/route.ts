import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/lib/clan/board";
import { loadOwnedPersonalEmblemCase } from "@/lib/personal-emblems/load-owned-case";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const clanId = new URL(request.url).searchParams.get("clan");
  if (clanId !== null && !uuidPattern.test(clanId)) return Response.json({ ok: false, error: "클랜 정보를 확인해 주세요." }, { status: 400, headers });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401, headers });
  try {
    const collection = await loadOwnedPersonalEmblemCase(client, clanId ?? undefined);
    return collection ? Response.json({ ok: true, collection }, { headers })
      : Response.json({ ok: false, error: "이 엠블럼 케이스를 볼 수 없습니다." }, { status: 403, headers });
  } catch {
    return Response.json({ ok: false, error: "엠블럼을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers });
  }
}
