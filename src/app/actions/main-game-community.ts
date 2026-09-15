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

  const { error } = await supabase.rpc("apply_lfg_post", {
    p_post_id: postId, p_message: message?.trim().slice(0, 200),
  });
  if (error) return { ok: false, error: error.message };

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

  const { error } = await supabase.rpc("resolve_lfg_application", {
    p_post_id: postId, p_application_id: applicationId, p_decision: "accepted",
  });
  if (error) return { ok: false, error: error.message };

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

  const { error } = await supabase.rpc("resolve_lfg_application", {
    p_post_id: postId, p_application_id: applicationId, p_decision: "rejected",
  });
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

  const { data: row, error: lookupError } = await supabase.from("lfg_applications")
    .select("post_id").eq("id", applicationId).eq("applicant_user_id", user.id).maybeSingle();
  if (lookupError || !row) return { ok: false, error: "취소할 신청이 없습니다." };
  const { error } = await supabase.rpc("resolve_lfg_application", {
    p_post_id: row.post_id, p_application_id: applicationId, p_decision: "canceled",
  });
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

  const { error } = await supabase.rpc("cancel_lfg_post", { p_post_id: postId });
  if (error) return { ok: false, error: error.message };

  revalidateMainGame(gameSlug);
  return { ok: true };
}
