"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";

type Result = { ok: true } | { ok: false; error: string };

async function officerContext(gameSlug: string, clanId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const ctx = await loadMainClanContext(supabase, user.id, gameSlug, clanId);
  if (!ctx || ctx.role === "member") return null;
  return { supabase, user };
}

function refreshClan(gameSlug: string, clanId: string) {
  const base = `/games/${gameSlug}/clan/${clanId}`;
  revalidatePath(base);
  revalidatePath(`${base}/manage`);
}

export async function saveClanNoticeAction(
  gameSlug: string,
  clanId: string,
  noticeId: string | null,
  formData: FormData,
): Promise<Result> {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isPinned = formData.get("is_pinned") === "on";
  if (!title || title.length > 200)
    return { ok: false, error: "제목은 1~200자로 입력해 주세요." };
  if (!content || content.length > 20000)
    return { ok: false, error: "본문은 1~20,000자로 입력해 주세요." };
  const actor = await officerContext(gameSlug, clanId);
  if (!actor)
    return { ok: false, error: "클랜 운영진만 공지를 관리할 수 있습니다." };
  const values = {
    title,
    content,
    is_pinned: isPinned,
    updated_by: actor.user.id,
  };
  const result = noticeId
    ? await actor.supabase
        .from("clan_notices")
        .update(values)
        .eq("id", noticeId)
        .eq("clan_id", clanId)
        .select("id")
        .maybeSingle()
    : await actor.supabase
        .from("clan_notices")
        .insert({ ...values, clan_id: clanId, created_by: actor.user.id })
        .select("id")
        .single();
  if (result.error || !result.data)
    return {
      ok: false,
      error: "공지를 저장하지 못했습니다. 권한과 공지 상태를 확인해 주세요.",
    };
  refreshClan(gameSlug, clanId);
  return { ok: true };
}

export async function setClanNoticePinnedAction(
  gameSlug: string,
  clanId: string,
  noticeId: string,
  pinned: boolean,
): Promise<Result> {
  const actor = await officerContext(gameSlug, clanId);
  if (!actor)
    return { ok: false, error: "클랜 운영진만 공지를 관리할 수 있습니다." };
  if (typeof pinned !== "boolean")
    return { ok: false, error: "고정 상태를 확인해 주세요." };
  const result = await actor.supabase
    .from("clan_notices")
    .update({ is_pinned: pinned, updated_by: actor.user.id })
    .eq("id", noticeId)
    .eq("clan_id", clanId)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return { ok: false, error: "공지 고정 상태를 변경하지 못했습니다." };
  refreshClan(gameSlug, clanId);
  return { ok: true };
}

export async function deleteClanNoticeAction(
  gameSlug: string,
  clanId: string,
  noticeId: string,
): Promise<Result> {
  const actor = await officerContext(gameSlug, clanId);
  if (!actor)
    return { ok: false, error: "클랜 운영진만 공지를 관리할 수 있습니다." };
  const result = await actor.supabase
    .from("clan_notices")
    .delete()
    .eq("id", noticeId)
    .eq("clan_id", clanId)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return {
      ok: false,
      error: "공지를 삭제하지 못했습니다. 이미 삭제됐는지 확인해 주세요.",
    };
  refreshClan(gameSlug, clanId);
  return { ok: true };
}

export async function saveClanRulesAction(
  gameSlug: string,
  clanId: string,
  rules: string,
): Promise<Result> {
  if (typeof rules !== "string" || rules.length > 20000)
    return { ok: false, error: "규칙은 20,000자 이내로 입력해 주세요." };
  const actor = await officerContext(gameSlug, clanId);
  if (!actor)
    return { ok: false, error: "클랜 운영진만 규칙을 수정할 수 있습니다." };
  const result = await actor.supabase.rpc("update_clan_rules", {
    p_clan_id: clanId,
    p_rules: rules.trim(),
  });
  if (result.error)
    return {
      ok: false,
      error: "규칙을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  refreshClan(gameSlug, clanId);
  return { ok: true };
}
