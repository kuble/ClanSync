"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MainGameActionResult = { ok: true } | { ok: false; error: string };

async function gameIdFromSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameSlug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .maybeSingle();
  return data?.id ?? null;
}

function revalidateMainGame(gameSlug: string) {
  revalidatePath(`/games/${gameSlug}`);
}

export async function createPromotionPostAction(
  gameSlug: string,
  title: string,
  content: string,
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const { data: clanRows } = await supabase.rpc("my_active_clan_for_game", {
    p_game_id: gid,
  });
  const clanId = clanRows?.[0]?.clan_id;
  if (!clanId) {
    return { ok: false, error: "홍보글은 해당 게임에 소속된 클랜이 있어야 작성할 수 있습니다." };
  }

  const t = title.trim().slice(0, 200);
  const body = content.trim().slice(0, 8000);
  if (!t) return { ok: false, error: "제목을 입력해 주세요." };

  const { error } = await supabase.from("board_posts").insert({
    game_id: gid,
    clan_id: clanId,
    post_type: "promotion",
    title: t,
    content: body || "",
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidateMainGame(gameSlug);
  return { ok: true };
}

export async function createLfgPostAction(
  gameSlug: string,
  input: {
    mode: string;
    format: string;
    slots: number;
    startTimeHour: number;
    expiresAtIso: string;
    micRequired: boolean;
    description?: string;
  },
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const { data: ugp } = await supabase
    .from("user_game_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", gid)
    .eq("is_verified", true)
    .maybeSingle();
  if (!ugp) {
    return { ok: false, error: "게임 계정을 연동해야 LFG를 등록할 수 있습니다." };
  }

  const slots = Math.floor(Number(input.slots));
  if (slots < 1 || slots > 11) {
    return { ok: false, error: "모집 인원은 1~11 사이여야 합니다." };
  }

  const hour = Math.floor(Number(input.startTimeHour));
  if (hour < 0 || hour > 23) {
    return { ok: false, error: "시작 시각(시)이 올바르지 않습니다." };
  }

  const exp = new Date(input.expiresAtIso);
  if (Number.isNaN(exp.getTime()) || exp.getTime() <= Date.now()) {
    return { ok: false, error: "모집 마감은 미래 시각이어야 합니다." };
  }

  const { error } = await supabase.from("lfg_posts").insert({
    game_id: gid,
    creator_user_id: user.id,
    mode: input.mode.trim().slice(0, 64) || "일반",
    format: input.format.trim().slice(0, 32) || "5vs5",
    slots,
    start_time_hour: hour,
    expires_at: exp.toISOString(),
    mic_required: input.micRequired,
    description: input.description?.trim().slice(0, 2000) || null,
    tiers: [],
    positions: [],
  });
  if (error) return { ok: false, error: error.message };

  revalidateMainGame(gameSlug);
  return { ok: true };
}

export async function applyLfgPostAction(
  gameSlug: string,
  postId: string,
  message?: string,
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase
    .from("lfg_posts")
    .select("id, creator_user_id, status, expires_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.status !== "open") {
    return { ok: false, error: "모집을 찾을 수 없거나 마감되었습니다." };
  }
  if (new Date(post.expires_at as string) <= new Date()) {
    return { ok: false, error: "모집이 마감되었습니다." };
  }
  if (post.creator_user_id === user.id) {
    return { ok: false, error: "본인 모집에는 신청할 수 없습니다." };
  }

  const { error } = await supabase.from("lfg_applications").insert({
    post_id: postId,
    applicant_user_id: user.id,
    message: message?.trim().slice(0, 200) || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 신청한 모집입니다." };
    }
    return { ok: false, error: error.message };
  }

  revalidateMainGame(gameSlug);
  return { ok: true };
}

export async function acceptLfgApplicationAction(
  gameSlug: string,
  postId: string,
  applicationId: string,
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase
    .from("lfg_posts")
    .select("id, creator_user_id, slots, status")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.creator_user_id !== user.id || post.status !== "open") {
    return { ok: false, error: "처리할 수 없는 모집입니다." };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("lfg_applications")
    .update({
      status: "accepted",
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq("id", applicationId)
    .eq("post_id", postId)
    .eq("status", "applied");

  if (upErr) return { ok: false, error: upErr.message };

  const { count } = await supabase
    .from("lfg_applications")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("status", "accepted");

  if ((count ?? 0) >= (post.slots ?? 99)) {
    await supabase.from("lfg_posts").update({ status: "filled" }).eq("id", postId);
    await supabase
      .from("lfg_applications")
      .update({
        status: "expired",
        resolved_at: now,
      })
      .eq("post_id", postId)
      .eq("status", "applied");
  }

  revalidateMainGame(gameSlug);
  return { ok: true };
}

export async function rejectLfgApplicationAction(
  gameSlug: string,
  postId: string,
  applicationId: string,
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase
    .from("lfg_posts")
    .select("id, creator_user_id, status")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.creator_user_id !== user.id || post.status !== "open") {
    return { ok: false, error: "처리할 수 없는 모집입니다." };
  }

  const { error } = await supabase
    .from("lfg_applications")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", applicationId)
    .eq("post_id", postId)
    .eq("status", "applied");

  if (error) return { ok: false, error: error.message };

  revalidateMainGame(gameSlug);
  return { ok: true };
}

export async function cancelLfgApplicationAction(
  gameSlug: string,
  applicationId: string,
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: row } = await supabase
    .from("lfg_applications")
    .select("id, applicant_user_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!row || row.applicant_user_id !== user.id || row.status !== "applied") {
    return { ok: false, error: "취소할 신청이 없습니다." };
  }

  const { error } = await supabase
    .from("lfg_applications")
    .update({
      status: "canceled",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", applicationId);

  if (error) return { ok: false, error: error.message };

  revalidateMainGame(gameSlug);
  return { ok: true };
}

export async function cancelLfgPostAction(
  gameSlug: string,
  postId: string,
): Promise<MainGameActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: post } = await supabase
    .from("lfg_posts")
    .select("id, creator_user_id, status")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.creator_user_id !== user.id || post.status !== "open") {
    return { ok: false, error: "취소할 모집이 없습니다." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("lfg_posts")
    .update({ status: "canceled" })
    .eq("id", postId);

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("lfg_applications")
    .update({
      status: "expired",
      resolved_at: now,
    })
    .eq("post_id", postId)
    .eq("status", "applied");

  revalidateMainGame(gameSlug);
  return { ok: true };
}
