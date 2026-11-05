import { saveClanPromotionAction } from "@/app/actions/clan-promotion";

export async function POST(request: Request, context: { params: Promise<{ gameSlug: string; clanId: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || URL.canParse(origin) === false || new URL(origin).host !== host) {
    return Response.json({ ok: false, error: "요청 출처를 확인해 주십시오." }, { status: 403 });
  }
  const { gameSlug, clanId } = await context.params;
  const result = await saveClanPromotionAction(gameSlug, clanId, await request.formData());
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
