"use server";

import { revalidatePath } from "next/cache";
import { ensurePublicUserProfile } from "@/lib/auth/ensure-public-user";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

const TIER_SET = new Set([
  "bronze",
  "silver",
  "gold",
  "plat",
  "diamond",
  "master",
  "gm",
  "challenger",
]);

function normalizeTags(raw: string[]): string[] {
  const out: string[] = [];
  for (const t of raw) {
    const s = t.trim();
    if (!s) continue;
    if (s.length > 12 || out.length >= 5) return [];
    if (!/^[가-힣a-zA-Z0-9\s]+$/.test(s)) return [];
    out.push(s);
  }
  return out;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function allowDevGameLink(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_GAME_LINK_SIMULATOR === "1"
  );
}

/** 개발·QA용 게임 인증 완료 시뮬레이션 (실 OAuth 콜백 전 단계). */
export async function linkGameAccountDevAction(
  gameSlug: string,
): Promise<ActionResult> {
  if (!allowDevGameLink()) {
    return { ok: false, error: "이 환경에서는 시뮬레이션 연동을 사용할 수 없습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const ensured = await ensurePublicUserProfile(user.id);
  if (!ensured.ok) {
    return { ok: false, error: ensured.error };
  }

  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id, slug, is_active")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (gErr || !game?.is_active) {
    return { ok: false, error: "연동할 수 없는 게임입니다." };
  }

  const stamp = new Date().toISOString();
  const { error } = await supabase.from("user_game_profiles").upsert(
    {
      user_id: user.id,
      game_id: game.id,
      game_uid: `dev:${game.slug}:${user.id.slice(0, 8)}`,
      is_verified: true,
      verified_at: stamp,
      updated_at: stamp,
    },
    { onConflict: "user_id,game_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/games");
  revalidatePath(`/games/${gameSlug}/auth`);
  revalidatePath(`/games/${gameSlug}/clan`);
  return { ok: true };
}

export type CreateClanResult =
  | { ok: true; clanId: string }
  | { ok: false; error: string };

export async function createClanAndLeadAction(
  gameSlug: string,
  formData: FormData,
): Promise<CreateClanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .maybeSingle();
  if (gErr || !game) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const { data: ugp } = await supabase
    .from("user_game_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .maybeSingle();
  if (!ugp?.is_verified) {
    return { ok: false, error: "먼저 게임 계정을 연동해 주세요." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 24) {
    return { ok: false, error: "클랜명은 1~24자여야 합니다." };
  }

  const maxMembersRaw = Number(formData.get("max_members") ?? 30);
  const max_members = Math.min(200, Math.max(2, maxMembersRaw || 30));

  const description = String(formData.get("description") ?? "").trim() || null;
  const rules = String(formData.get("rules") ?? "").trim() || null;
  const discord_url = String(formData.get("discord_url") ?? "").trim() || null;
  const kakao_url = String(formData.get("kakao_url") ?? "").trim() || null;

  const gender_policy =
    (formData.get("gender_policy") as string) === "male" ||
    (formData.get("gender_policy") as string) === "female"
      ? (formData.get("gender_policy") as "male" | "female")
      : "all";

  const styleRaw = String(formData.get("style") ?? "").trim();
  const style =
    styleRaw === "social" ||
    styleRaw === "casual" ||
    styleRaw === "tryhard" ||
    styleRaw === "pro"
      ? styleRaw
      : null;

  const tags = normalizeTags(
    String(formData.get("tags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (tags.length === 0 && String(formData.get("tags") ?? "").trim()) {
    return { ok: false, error: "태그 형식이 올바르지 않습니다." };
  }

  const tierRaw = formData.getAll("tier_range") as string[];
  const tier_range = [
    ...new Set(
      tierRaw.filter((t): t is string => typeof t === "string" && TIER_SET.has(t)),
    ),
  ];

  const minYearRaw = String(formData.get("min_birth_year") ?? "").trim();
  const min_birth_year = minYearRaw
    ? Math.min(9999, Math.max(1950, Number(minYearRaw)))
    : null;

  const service = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: clan, error: cErr } = await service
    .from("clans")
    .insert({
      game_id: game.id,
      name,
      description,
      rules,
      style,
      tier_range,
      min_birth_year,
      tags,
      gender_policy,
      max_members,
      discord_url,
      kakao_url,
      last_activity_at: now,
    })
    .select("id")
    .single();

  if (cErr || !clan) {
    return { ok: false, error: cErr?.message ?? "클랜을 만들지 못했습니다." };
  }

  const { error: mErr } = await service.from("clan_members").insert({
    clan_id: clan.id,
    user_id: user.id,
    role: "leader",
    status: "active",
    joined_at: now,
    last_activity_at: now,
  });

  if (mErr) {
    await service.from("clans").delete().eq("id", clan.id);
    return { ok: false, error: mErr.message };
  }

  revalidatePath("/games");
  revalidatePath(`/games/${gameSlug}/clan`);
  return { ok: true, clanId: clan.id };
}

export async function submitClanJoinRequestAction(
  gameSlug: string,
  clanId: string,
  message: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: game, error: gErr } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .maybeSingle();
  if (gErr || !game) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const { data: ugp } = await supabase
    .from("user_game_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .maybeSingle();
  if (!ugp?.is_verified) {
    return { ok: false, error: "먼저 게임 계정을 연동해 주세요." };
  }

  const { data: clan } = await supabase
    .from("clans")
    .select("id, game_id, name, moderation_status, lifecycle_status")
    .eq("id", clanId)
    .maybeSingle();

  if (!clan || clan.game_id !== game.id) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }
  if (
    clan.lifecycle_status !== "active" ||
    clan.moderation_status !== "clean"
  ) {
    return { ok: false, error: "이 클랜에는 지금 가입 신청할 수 없습니다." };
  }

  const msg = message.trim().slice(0, 2000);

  const { data: existing } = await supabase
    .from("clan_join_requests")
    .select("id, clan_id, clans!inner(name)")
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing && existing.clan_id !== clanId) {
    const other = existing.clans as unknown as { name: string };
    return {
      ok: false,
      error: `PENDING_ELSEWHERE:${other?.name ?? "다른 클랜"}`,
    };
  }

  if (existing?.clan_id === clanId) {
    return { ok: false, error: "이미 이 클랜에 신청 중입니다." };
  }

  const { error } = await supabase.from("clan_join_requests").insert({
    clan_id: clanId,
    user_id: user.id,
    game_id: game.id,
    status: "pending",
    message: msg,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 진행 중인 신청이 있습니다." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/games");
  revalidatePath(`/games/${gameSlug}/clan`);
  return { ok: true };
}

export async function replacePendingJoinRequestAction(
  gameSlug: string,
  newClanId: string,
  message: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .maybeSingle();
  if (!game) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const { data: pending } = await supabase
    .from("clan_join_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!pending) {
    return submitClanJoinRequestAction(gameSlug, newClanId, message);
  }

  const { error: uErr } = await supabase
    .from("clan_join_requests")
    .update({
      status: "canceled",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", pending.id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (uErr) return { ok: false, error: uErr.message };

  return submitClanJoinRequestAction(gameSlug, newClanId, message);
}

export async function cancelClanJoinRequestAction(
  gameSlug: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .maybeSingle();
  if (!game) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("clan_join_requests")
    .update({
      status: "canceled",
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/games");
  revalidatePath(`/games/${gameSlug}/clan`);
  return { ok: true };
}

/** `<form action>` 용 — Next 요구 반환 타입 `Promise<void>`. */
export async function cancelClanJoinRequestFormAction(
  gameSlug: string,
  formData: FormData,
): Promise<void> {
  void formData;
  const r = await cancelClanJoinRequestAction(gameSlug);
  if (!r.ok) throw new Error(r.error);
}
