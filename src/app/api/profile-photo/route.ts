import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { PROFILE_PHOTO_BUCKET as bucket, PROFILE_PHOTO_LIMIT as limit, profilePhotoUrl } from "@/lib/profile/photo";
import { processProfilePhoto } from "@/lib/profile/process-profile-photo";

export const runtime = "nodejs";
const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

async function access(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try { if ((origin && new URL(origin).host !== host) || request.headers.get("sec-fetch-site") === "cross-site") return fail("요청 출처를 확인해 주세요.", 403); }
  catch { return fail("요청 출처를 확인해 주세요.", 403); }
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.", 401);
  const { data, error } = await client.from("account_profile_photos").select("image_path").eq("user_id", user.id).maybeSingle();
  if (error) return fail("프로필 사진을 불러오지 못했습니다.", 500);
  return { userId: user.id, previous: data?.image_path ?? null, exists: !!data, svc: createServiceRoleClient() };
}

async function cleanup(svc: ReturnType<typeof createServiceRoleClient>, path: string) {
  const { error } = await svc.storage.from(bucket).remove([path]);
  if (error) console.error("Profile photo cleanup failed", error.message);
}

async function save(ctx: Exclude<Awaited<ReturnType<typeof access>>, Response>, path: string | null) {
  const { svc, userId, previous } = ctx;
  if (ctx.exists || path) {
    const query = ctx.exists ? svc.from("account_profile_photos").update({ image_path: path }).eq("user_id", userId) : svc.from("account_profile_photos").insert({ user_id: userId, image_path: path });
    const result = await (ctx.exists ? previous ? query.eq("image_path", previous) : query.is("image_path", null) : query).select("user_id").maybeSingle();
    if (result.error || !result.data) {
      if (path) await cleanup(svc, path);
      return fail("사진이 변경되었거나 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.", 409);
    }
  }
  if (previous && previous !== path) await cleanup(svc, previous);
  revalidatePath("/profile");
  revalidatePath("/games/[gameSlug]/clan/[clanId]", "layout");
  return Response.json({ ok: true, url: profilePhotoUrl(path) });
}

export async function POST(request: Request) {
  const ctx = await access(request);
  if (ctx instanceof Response) return ctx;
  let output: Buffer;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (!reader) return fail("사진을 선택해 주세요.", 400);
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit + 65536) { await reader.cancel(); return fail("사진은 최대 2MB까지 업로드할 수 있습니다.", 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > limit || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail("JPG·PNG·WebP 사진을 2MB 이내로 선택해 주세요.", 400);
    const crop = form.get("crop");
    output = await processProfilePhoto(Buffer.from(await file.arrayBuffer()), crop === null ? null : JSON.parse(String(crop)));
  } catch (error) { return fail(error instanceof Error && ["이미지 자르기 영역을 확인해 주세요.", "정적인 JPG·PNG·WebP 사진을 선택해 주세요."].includes(error.message) ? error.message : "사진을 읽지 못했습니다. 다른 이미지를 선택해 주세요.", 400); }
  const path = `${ctx.userId}/${randomUUID()}.webp`;
  const { error } = await ctx.svc.storage.from(bucket).upload(path, output, { contentType: "image/webp", upsert: false });
  if (error) return fail("사진을 업로드하지 못했습니다. 다시 시도해 주세요.", 500);
  return save(ctx, path);
}

export async function DELETE(request: Request) {
  const ctx = await access(request);
  return ctx instanceof Response ? ctx : save(ctx, null);
}
