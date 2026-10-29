import { randomUUID } from "node:crypto";
import { processEmojiImage } from "@/lib/clan/process-emoji";
import { CLAN_EMOJI_GIF_ENABLED } from "@/lib/clan/emoji-crop";
import { revalidatePath } from "next/cache";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/supabase/request";
import { EMOJI_BUCKET, EMOJI_LIMIT, emojiNamePattern } from "@/lib/clan/cosmetics";
import { uuidPattern } from "@/lib/clan/board";

export const runtime = "nodejs";
type Context = { params: Promise<{ gameSlug: string; clanId: string }> };
const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });
async function access(request: Request, context: Context) {
  const origin = request.headers.get("origin"), host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try { if (origin && new URL(origin).host !== host) return fail("요청 출처를 확인해 주십시오.", 403); } catch { return fail("요청 출처를 확인해 주십시오.", 403); }
  const { gameSlug, clanId } = await context.params;
  if (!uuidPattern.test(clanId)) return fail("클랜을 확인해 주십시오.", 400);
  const user = await getRequestUser();
  if (!user) return fail("로그인이 필요합니다.", 401);
  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) return fail("클랜을 확인해 주십시오.", 404);
  if (ctx.role === "member" || !await hasRequestClanPermission(clanId, "manage_clan_pool")) return fail("클랜 꾸미기 관리 권한이 없습니다.", 403);
  const svc = createServiceRoleClient();
  return { svc, userId: user.id, gameSlug, clanId };
}
async function removeFile(svc: ReturnType<typeof createServiceRoleClient>, path: string) {
  const result = await svc.storage.from(EMOJI_BUCKET).remove([path]);
  if (result.error) console.error("Emoji file cleanup failed", result.error.message);
}
function refresh(gameSlug: string, clanId: string) { revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout"); }

export async function POST(request: Request, context: Context) {
  const ctx = await access(request, context);
  if (ctx instanceof Response) return ctx;
  let output: Buffer, name: string;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    const reader = request.body?.getReader();
    if (!reader) return fail("이모티콘 이미지를 선택해 주십시오.");
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > EMOJI_LIMIT + 65536) { await reader.cancel(); return Response.json({ ok: false, error: "256KB 이하 이미지를 선택해 주십시오." }, { status: 413, headers: { Connection: "close" } }); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    name = String(form.get("name") ?? "").trim();
    if (!emojiNamePattern.test(name)) return fail("이름은 한글·영문·숫자·밑줄로 2~32자 입력해 주십시오.");
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > EMOJI_LIMIT || !["image/png", "image/webp", "image/jpeg",...(CLAN_EMOJI_GIF_ENABLED?["image/gif"]:[])].includes(file.type)) return fail("정적 PNG·WebP·JPG 이미지를 256KB 이내로 선택해 주십시오.");
    const crop=form.get("crop");
    output = await processEmojiImage(Buffer.from(await file.arrayBuffer()),crop?JSON.parse(String(crop)):null);
  } catch (error) { return fail(error instanceof Error && /선택해|확인해|크기가|넘습니다/.test(error.message) ? error.message : "이미지를 읽지 못했습니다. 다른 파일을 선택해 주십시오."); }
  const id = randomUUID(), path = `${ctx.clanId}/${id}/${randomUUID()}.webp`;
  const upload = await ctx.svc.storage.from(EMOJI_BUCKET).upload(path, output, { contentType: "image/webp", upsert: false });
  if (upload.error) { await removeFile(ctx.svc, path); return fail("이미지 업로드에 실패했습니다.", 500); }
  const saved = await ctx.svc.rpc("add_clan_emoji", { p_actor_id: ctx.userId, p_clan_id: ctx.clanId, p_id: id, p_name: name, p_image_path: path });
  if (saved.error) {
    const persisted = await ctx.svc.from("clan_emojis").select("id").eq("id", id).maybeSingle();
    if (persisted.error) return fail("저장 결과를 확인하지 못했습니다. 새로고침 후 확인해 주십시오.", 503);
    if (!persisted.data) { await removeFile(ctx.svc, path); return fail("저장하지 못했습니다. 다시 시도해 주십시오.", 500); }
  } else if (saved.data?.ok !== true) {
    await removeFile(ctx.svc, path);
    return fail(saved.data?.error === "slots_full" ? "이모티콘 슬롯이 가득 찼습니다." : saved.data?.error === "duplicate_name" ? "같은 이름의 이모티콘이 있습니다." : "먼저 이모티콘 슬롯을 구매해 주십시오.");
  }
  refresh(ctx.gameSlug, ctx.clanId);
  return Response.json({ ok: true, id });
}
export async function DELETE(request: Request, context: Context) {
  const ctx = await access(request, context);
  if (ctx instanceof Response) return ctx;
  let id: unknown;
  try { id = (await request.json()).id; } catch { return fail("이모티콘을 확인해 주십시오."); }
  if (typeof id !== "string" || !uuidPattern.test(id)) return fail("이모티콘을 확인해 주십시오.");
  const deleted = await ctx.svc.from("clan_emojis").delete().eq("id", id).eq("clan_id", ctx.clanId).select("image_path").maybeSingle();
  if (deleted.error || !deleted.data) return fail("이모티콘을 삭제하지 못했습니다.", 404);
  await removeFile(ctx.svc, deleted.data.image_path);
  refresh(ctx.gameSlug, ctx.clanId);
  return Response.json({ ok: true });
}
