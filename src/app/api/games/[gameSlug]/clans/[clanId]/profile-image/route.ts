import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";

export const runtime = "nodejs";
const bucket = "clan-profiles";
const limit = 2 * 1024 * 1024;
type Context = { params: Promise<{ gameSlug: string; clanId: string }> };
const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

async function access(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    try { if (new URL(origin).host !== host) return fail("요청 출처를 확인해 주십시오.", 403); }
    catch { return fail("요청 출처를 확인해 주십시오.", 403); }
  }
  const { gameSlug, clanId } = await context.params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.", 401);
  const { data: members } = await client.rpc("select_my_clan_membership", { p_clan_id: clanId });
  if (!members?.some((row: { status: string; role: string }) => row.status === "active" && (row.role === "leader" || row.role === "officer")) || !await hasClanPermission(client, user.id, clanId, "manage_clan_pool")) return fail("클랜 꾸미기 관리 권한이 없습니다.", 403);
  const svc = createServiceRoleClient();
  const { data: clan, error } = await svc.from("clans").select("icon_url,games!inner(slug)").eq("id", clanId).maybeSingle();
  if (error || !clan || (clan.games as unknown as { slug: string }).slug !== gameSlug) return fail("클랜을 찾을 수 없습니다.", 404);
  return { svc, clanId, gameSlug, previous: clan.icon_url as string | null };
}

async function cleanup(svc: ReturnType<typeof createServiceRoleClient>, paths: string[]) {
  if (!paths.length) return;
  const { error } = await svc.storage.from(bucket).remove(paths);
  if (error) console.error("Clan profile cleanup failed", error.message);
}

async function save(ctx: Exclude<Awaited<ReturnType<typeof access>>, Response>, url: string | null, uploaded?: string) {
  const { svc, clanId, gameSlug, previous } = ctx;
  let query = svc.from("clans").update({ icon_url: url }).eq("id", clanId);
  query = previous === null ? query.is("icon_url", null) : query.eq("icon_url", previous);
  const result = await query.select("id").maybeSingle();
  if (result.error || !result.data) {
    if (uploaded) await cleanup(svc, [uploaded]);
    return fail("이미지가 변경되었거나 저장에 실패했습니다. 새로고침 후 다시 시도해 주십시오.", 409);
  }
  const prefix = svc.storage.from(bucket).getPublicUrl(clanId + "/").data.publicUrl;
  const filename = previous?.startsWith(prefix) ? previous.slice(prefix.length) : "";
  if (/^[0-9a-f-]{36}\.webp$/.test(filename)) await cleanup(svc, [clanId + "/" + filename]);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout");
  revalidatePath(`/games/${gameSlug}/clan`);
  return Response.json({ ok: true, url });
}

export async function POST(request: Request, context: Context) {
  const ctx = await access(request, context);
  if (ctx instanceof Response) return ctx;
  let output: Buffer;
  try {
    // Bound streamed multipart bodies too; Content-Length is not trusted.
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (!reader) return fail("이미지를 선택해 주십시오.", 400);
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit + 65536) {
        await reader.cancel();
        return Response.json({ ok: false, error: "이미지는 최대 2MB까지 업로드할 수 있습니다." }, { status: 413, headers: { Connection: "close" } });
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > limit || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail("JPG·PNG·WebP 이미지를 2MB 이내로 선택해 주십시오.", 400);
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 16_000_000 });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) return fail("정적인 JPG·PNG·WebP 이미지를 선택해 주십시오.", 400);
    output = await image.rotate().resize(512, 512, { fit: "cover", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { return fail("이미지 파일을 읽지 못했습니다. 다른 이미지를 선택해 주십시오.", 400); }
  const path = `${ctx.clanId}/${randomUUID()}.webp`;
  const { error } = await ctx.svc.storage.from(bucket).upload(path, output, { contentType: "image/webp", upsert: false });
  if (error) return fail("이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해 주십시오.", 500);
  return save(ctx, ctx.svc.storage.from(bucket).getPublicUrl(path).data.publicUrl, path);
}

export async function DELETE(request: Request, context: Context) {
  const ctx = await access(request, context);
  return ctx instanceof Response ? ctx : save(ctx, null);
}
