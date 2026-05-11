"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ScrimRoomActionResult =
  | { ok: true; needReconfirm?: boolean }
  | { ok: false; error: string };

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

function revalidateScrimSurfaces(
  gameSlug: string,
  clanA: string | null,
  clanB: string | null | undefined,
) {
  revalidatePath(`/games/${gameSlug}`);
  if (clanA) {
    revalidatePath(`/games/${gameSlug}/clan/${clanA}/events`);
  }
  if (clanB) {
    revalidatePath(`/games/${gameSlug}/clan/${clanB}/events`);
  }
}

const TIER_LO = 0;
const TIER_HI = 5000;

/** null,null = 미사용 · 둘 다 있어야 유효 */
function parseTierPair(
  minIn: number | null | undefined,
  maxIn: number | null | undefined,
):
  | { ok: true; tier_min: number | null; tier_max: number | null }
  | { ok: false; error: string } {
  const minUnset = minIn === undefined || minIn === null;
  const maxUnset = maxIn === undefined || maxIn === null;
  if (minUnset && maxUnset) {
    return { ok: true, tier_min: null, tier_max: null };
  }
  if (minUnset || maxUnset) {
    return { ok: false, error: "티어 하한·상한을 함께 입력하거나 둘 다 비우세요." };
  }
  if (!Number.isInteger(minIn) || !Number.isInteger(maxIn)) {
    return { ok: false, error: "티어는 정수만 입력할 수 있습니다." };
  }
  if (
    minIn < TIER_LO ||
    maxIn > TIER_HI ||
    minIn > maxIn
  ) {
    return {
      ok: false,
      error: `티어는 ${TIER_LO}~${TIER_HI}이며 하한 ≤ 상한이어야 합니다.`,
    };
  }
  return { ok: true, tier_min: minIn, tier_max: maxIn };
}

/** 개설 클랜 운영진+(`confirm_scrim`) — RLS가 INSERT를 막으므로 서비스 롤. */
export async function createDraftScrimRoomAction(
  gameSlug: string,
  hostClanId: string,
  input: {
    scheduledAtIso: string;
    title?: string;
    place?: string;
    mode?: string;
    memo?: string;
    tierMin?: number | null;
    tierMax?: number | null;
  },
): Promise<ScrimRoomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    hostClanId,
    "confirm_scrim",
  );
  if (!allowed) {
    return { ok: false, error: "스크림을 개설할 권한이 없습니다." };
  }

  const { data: clanRow } = await supabase
    .from("clans")
    .select("id")
    .eq("id", hostClanId)
    .eq("game_id", gid)
    .maybeSingle();
  if (!clanRow) {
    return { ok: false, error: "이 게임 소속 클랜만 스크림을 개설할 수 있습니다." };
  }

  const start = new Date(input.scheduledAtIso);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "일시가 올바르지 않습니다." };
  }

  const titleRaw = (input.title ?? "").trim();
  const title = titleRaw ? titleRaw.slice(0, 200) : null;
  const placeRaw = (input.place ?? "").trim();
  const place = placeRaw ? placeRaw.slice(0, 500) : null;
  const modeRaw = (input.mode ?? "").trim();
  const mode = modeRaw ? modeRaw.slice(0, 32) : null;
  const memoRaw = (input.memo ?? "").trim();
  const memo = memoRaw ? memoRaw.slice(0, 5000) : null;

  const tiers = parseTierPair(input.tierMin, input.tierMax);
  if (!tiers.ok) return { ok: false, error: tiers.error };

  const svc = createServiceRoleClient();
  const { error } = await svc.from("scrim_rooms").insert({
    clan_a_id: hostClanId,
    scheduled_at: start.toISOString(),
    title,
    place,
    mode,
    tier_min: tiers.tier_min,
    tier_max: tiers.tier_max,
    memo,
    status: "draft",
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidateScrimSurfaces(gameSlug, hostClanId, null);
  return { ok: true };
}

/** 호스트 측: 상대 클랜 지정 후 matched 전이 (서비스 롤 UPDATE). */
export async function attachGuestClanToScrimAction(
  gameSlug: string,
  hostClanId: string,
  scrimRoomId: string,
  guestClanId: string,
): Promise<ScrimRoomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    hostClanId,
    "confirm_scrim",
  );
  if (!allowed) {
    return { ok: false, error: "상대 클랜을 지정할 권한이 없습니다." };
  }

  if (guestClanId === hostClanId) {
    return { ok: false, error: "같은 클랜은 지정할 수 없습니다." };
  }

  const { data: guest } = await supabase
    .from("clans")
    .select("id")
    .eq("id", guestClanId)
    .eq("game_id", gid)
    .maybeSingle();
  if (!guest) {
    return { ok: false, error: "같은 게임의 다른 클랜만 지정할 수 있습니다." };
  }

  const svc = createServiceRoleClient();
  const { data: room, error: selErr } = await svc
    .from("scrim_rooms")
    .select("id, clan_a_id, clan_b_id, status")
    .eq("id", scrimRoomId)
    .maybeSingle();

  if (selErr || !room) return { ok: false, error: "스크림을 찾을 수 없습니다." };
  if (room.clan_a_id !== hostClanId) {
    return { ok: false, error: "개설 클랜만 상대를 지정할 수 있습니다." };
  }
  if (room.clan_b_id != null) {
    return { ok: false, error: "이미 상대 클랜이 지정되어 있습니다." };
  }
  if (room.status !== "draft") {
    return { ok: false, error: "모집 중인 스크림만 상대를 지정할 수 있습니다." };
  }

  const { error: upErr } = await svc
    .from("scrim_rooms")
    .update({
      clan_b_id: guestClanId,
      status: "matched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", scrimRoomId)
    .eq("clan_a_id", hostClanId)
    .is("clan_b_id", null)
    .eq("status", "draft");

  if (upErr) return { ok: false, error: upErr.message };

  revalidateScrimSurfaces(gameSlug, hostClanId, guestClanId);
  return { ok: true };
}

/** 양측 확정 삽입 — RLS 정책으로 본인 클랜·역할 검증. */
export async function confirmScrimSideAction(
  gameSlug: string,
  scrimRoomId: string,
  side: Database["public"]["Enums"]["scrim_confirm_side"],
): Promise<ScrimRoomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const { data: room } = await supabase
    .from("scrim_rooms")
    .select("clan_a_id, clan_b_id, status")
    .eq("id", scrimRoomId)
    .maybeSingle();

  if (!room || room.status !== "matched" || !room.clan_b_id) {
    return {
      ok: false,
      error: "양 클랜이 배정된 협상 중 스크림만 확정할 수 있습니다.",
    };
  }

  const clanId =
    side === "host" ? room.clan_a_id : room.clan_b_id;

  const { data: cRowGame } = await supabase
    .from("clans")
    .select("game_id")
    .eq("id", clanId)
    .maybeSingle();
  if (!cRowGame || cRowGame.game_id !== gid) {
    return { ok: false, error: "잘못된 스크림입니다." };
  }

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "confirm_scrim",
  );
  if (!allowed) {
    return { ok: false, error: "스크림 확정 권한이 없습니다." };
  }

  const { error } = await supabase.from("scrim_room_confirmations").insert({
    scrim_room_id: scrimRoomId,
    side,
    confirmed_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 이 측에서 확정했습니다." };
    }
    return { ok: false, error: error.message };
  }

  const svc = createServiceRoleClient();
  const { data: after } = await svc
    .from("scrim_rooms")
    .select("status, clan_a_id, clan_b_id")
    .eq("id", scrimRoomId)
    .maybeSingle();

  revalidateScrimSurfaces(
    gameSlug,
    after?.clan_a_id ?? room.clan_a_id,
    after?.clan_b_id ?? room.clan_b_id,
  );

  return { ok: true };
}

/** 호스트 또는 (배정된) 게스트 운영진 — draft / matched / confirmed 만 취소 (서비스 롤). */
export async function cancelScrimRoomAction(
  gameSlug: string,
  scrimRoomId: string,
): Promise<ScrimRoomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const svc = createServiceRoleClient();
  const { data: room, error: selErr } = await svc
    .from("scrim_rooms")
    .select("clan_a_id, clan_b_id, status")
    .eq("id", scrimRoomId)
    .maybeSingle();

  if (selErr || !room) return { ok: false, error: "스크림을 찾을 수 없습니다." };

  const { data: hostGame } = await supabase
    .from("clans")
    .select("game_id")
    .eq("id", room.clan_a_id)
    .maybeSingle();
  if (!hostGame || hostGame.game_id !== gid) {
    return { ok: false, error: "잘못된 스크림입니다." };
  }

  const canHost = await hasClanPermission(
    supabase,
    user.id,
    room.clan_a_id,
    "confirm_scrim",
  );
  const canGuest =
    room.clan_b_id != null &&
    (await hasClanPermission(
      supabase,
      user.id,
      room.clan_b_id,
      "confirm_scrim",
    ));

  if (!canHost && !canGuest) {
    return { ok: false, error: "스크림을 취소할 권한이 없습니다." };
  }

  const st = room.status;
  if (st !== "draft" && st !== "matched" && st !== "confirmed") {
    return { ok: false, error: "취소할 수 없는 상태입니다." };
  }

  const now = new Date().toISOString();
  const { data: updated, error: upErr } = await svc
    .from("scrim_rooms")
    .update({
      status: "cancelled",
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", scrimRoomId)
    .in("status", ["draft", "matched", "confirmed"])
    .select("clan_a_id, clan_b_id");

  if (upErr) return { ok: false, error: upErr.message };
  if (!updated?.length) {
    return { ok: false, error: "이미 종료되었거나 취소된 스크림입니다." };
  }

  const row = updated[0];
  revalidateScrimSurfaces(gameSlug, row.clan_a_id, row.clan_b_id);
  return { ok: true };
}

/** 개설 클랜 운영진+ — 제목·일시·장소·모드·티어·메모 수정. D-SCRIM-02 무효화 필드(일시·장소·모드·티어) 변경 시 `needReconfirm`. */
export async function updateScrimRoomDetailsAction(
  gameSlug: string,
  hostClanId: string,
  scrimRoomId: string,
  input: {
    title: string;
    place: string;
    scheduledAtIso: string;
    mode: string;
    memo: string;
    tierMin: string;
    tierMax: string;
  },
): Promise<ScrimRoomActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const gid = await gameIdFromSlug(supabase, gameSlug);
  if (!gid) return { ok: false, error: "게임을 찾을 수 없습니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    hostClanId,
    "confirm_scrim",
  );
  if (!allowed) {
    return { ok: false, error: "스크림 일정을 수정할 권한이 없습니다." };
  }

  const { data: hostRow } = await supabase
    .from("clans")
    .select("id")
    .eq("id", hostClanId)
    .eq("game_id", gid)
    .maybeSingle();
  if (!hostRow) {
    return { ok: false, error: "이 게임 소속 클랜만 수정할 수 있습니다." };
  }

  const start = new Date(input.scheduledAtIso);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "일시가 올바르지 않습니다." };
  }
  const scheduledAt = start.toISOString();

  const minStr = input.tierMin.trim();
  const maxStr = input.tierMax.trim();
  let tierMinNum: number | null = null;
  let tierMaxNum: number | null = null;
  if (minStr !== "" || maxStr !== "") {
    if (minStr === "" || maxStr === "") {
      return { ok: false, error: "티어 하한·상한을 함께 입력하거나 둘 다 비우세요." };
    }
    tierMinNum = Number.parseInt(minStr, 10);
    tierMaxNum = Number.parseInt(maxStr, 10);
    if (!Number.isFinite(tierMinNum) || !Number.isFinite(tierMaxNum)) {
      return { ok: false, error: "티어는 정수만 입력할 수 있습니다." };
    }
    const tiers = parseTierPair(tierMinNum, tierMaxNum);
    if (!tiers.ok) return { ok: false, error: tiers.error };
    tierMinNum = tiers.tier_min;
    tierMaxNum = tiers.tier_max;
  }

  const svc = createServiceRoleClient();

  const { count: confCount } = await svc
    .from("scrim_room_confirmations")
    .select("*", { count: "exact", head: true })
    .eq("scrim_room_id", scrimRoomId);

  const hadConfirmations = (confCount ?? 0) > 0;

  const { data: room, error: roomErr } = await svc
    .from("scrim_rooms")
    .select(
      "clan_a_id, status, scheduled_at, place, mode, tier_min, tier_max, memo",
    )
    .eq("id", scrimRoomId)
    .maybeSingle();

  if (roomErr || !room) return { ok: false, error: "스크림을 찾을 수 없습니다." };
  if (room.clan_a_id !== hostClanId) {
    return { ok: false, error: "개설 클랜만 일정을 수정할 수 있습니다." };
  }
  if (room.status === "cancelled" || room.status === "finished") {
    return { ok: false, error: "이 상태에서는 수정할 수 없습니다." };
  }

  const titleRaw = input.title.trim();
  const title = titleRaw ? titleRaw.slice(0, 200) : null;
  const placeRaw = input.place.trim();
  const place = placeRaw ? placeRaw.slice(0, 500) : null;
  const modeRaw = input.mode.trim();
  const mode = modeRaw ? modeRaw.slice(0, 32) : null;
  const memoRaw = input.memo.trim();
  const memo = memoRaw ? memoRaw.slice(0, 5000) : null;

  const invalidateShape =
    scheduledAt !== room.scheduled_at ||
    place !== room.place ||
    mode !== room.mode ||
    tierMinNum !== room.tier_min ||
    tierMaxNum !== room.tier_max;

  const needReconfirm = hadConfirmations && invalidateShape;

  const { data: updated, error: upErr } = await svc
    .from("scrim_rooms")
    .update({
      title,
      place,
      scheduled_at: scheduledAt,
      mode,
      tier_min: tierMinNum,
      tier_max: tierMaxNum,
      memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scrimRoomId)
    .eq("clan_a_id", hostClanId)
    .in("status", ["draft", "matched", "confirmed"])
    .select("clan_a_id, clan_b_id");

  if (upErr) return { ok: false, error: upErr.message };
  if (!updated?.length) {
    return { ok: false, error: "수정할 수 없습니다." };
  }

  const row = updated[0];
  revalidateScrimSurfaces(gameSlug, row.clan_a_id, row.clan_b_id);

  return { ok: true, needReconfirm };
}
