import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { managedPromotionClan } from "@/lib/clan/promotion-access";
import { PROMOTION_IMAGE_BUCKET, PROMOTION_IMAGE_LIMIT, promotionImagePath } from "@/lib/clan/promotion";
import { uuidPattern } from "@/lib/clan/board";

export const runtime = "nodejs";
type Context = { params: Promise<{ gameSlug: string; clanId: string }> };
const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });

export async function POST(request: Request, context: Context) {
  const { gameSlug, clanId } = await context.params;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try { if (origin && new URL(origin).host !== host) return fail("요청 출처를 확인해 주십시오.", 403); }
  catch { return fail("요청 출처를 확인해 주십시오.", 403); }
  const access = await managedPromotionClan(gameSlug, clanId);
  if (!access) return fail("사진을 올릴 권한이 없습니다.", 403);
  const postId = request.headers.get("x-promotion-id") ?? "";
  if (!uuidPattern.test(postId)) return fail("홍보글을 확인해 주십시오.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(request.headers.get("content-type") ?? "")) return fail("JPEG·PNG·WebP 사진을 선택해 주십시오.");
  let output: Buffer;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("사진을 선택해 주십시오.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > PROMOTION_IMAGE_LIMIT) { await reader.cancel(); return fail("사진은 한 장당 5MB까지 올릴 수 있습니다.", 413); }
      chunks.push(chunk.value);
    }
    const image = sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000, animated: false });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) return fail("JPEG·PNG·WebP 사진을 선택해 주십시오.");
    output = await image.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { return fail("사진을 읽지 못했습니다. 다른 파일을 선택해 주십시오."); }
  const path = `${clanId}/${access.user.id}/${postId}/${randomUUID()}.webp`;
  const uploaded = await access.client.storage.from(PROMOTION_IMAGE_BUCKET).upload(path, output, { contentType: "image/webp", upsert: false });
  if (uploaded.error) return fail("사진을 올리지 못했습니다. 다시 시도해 주십시오.", 500);
  return Response.json({ ok: true, path });
}

export async function GET(request: Request, context: Context) {
  const { gameSlug, clanId } = await context.params;
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!uuidPattern.test(clanId) || !promotionImagePath.test(path) || !path.startsWith(`${clanId}/`)) return fail("사진을 찾을 수 없습니다.", 404);
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.", 401);
  const clan = await client.from("clans").select("games!inner(slug)").eq("id", clanId).eq("games.slug", gameSlug).eq("lifecycle_status", "active").eq("moderation_status", "clean").maybeSingle();
  if (clan.error || !clan.data) return fail("사진을 찾을 수 없습니다.", 404);
  const image = await client.storage.from(PROMOTION_IMAGE_BUCKET).download(path);
  if (image.error || !image.data) return fail("사진을 찾을 수 없습니다.", 404);
  return new Response(image.data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
