"use server";

import { revalidatePath } from "next/cache";
import { computeBalancePredictionDeadlineIso } from "@/lib/balance/prediction-deadline";
import {
  mapPoolForGameSlug,
  pickThreeMapCandidates,
} from "@/lib/balance/map-pools";
import {
  parseBanSettings,
  sameBanSettings,
  validateBanSettings,
  type BanSettings,
} from "@/lib/balance/prematch";
import {
  defaultMaForRoster,
  parseMaSnapshot,
  validateMaSnapshot,
  type MaSnapshot,
} from "@/lib/balance/ma-snapshot";
import {
  isOverwatchBalanceGame,
  isValidOwHeroId,
  resolveBannedHeroesFromScores,
  tallyHeroBanVotes,
} from "@/lib/balance/ow-hero-ban";
import {
  parseRoster,
  rosterAssignedUserIds,
  rosterHasDuplicateUsers,
  type BalanceRoster,
} from "@/lib/balance/roster-schema";
import {
  tallyMapVotes,
  weightedPickMapIndex,
} from "@/lib/balance/weighted-map-pick";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { canManageRound } from "@/lib/balance/room-access";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

export type BalanceSessionActionResult =
  | { ok: true }
  | { ok: false; error: string };

function balancePath(gameSlug: string, clanId: string): string {
  return `/games/${gameSlug}/clan/${clanId}/balance`;
}

export async function openBalanceSessionAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<BalanceSessionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const can = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!can) return { ok: false, error: "운영진만 세션을 열 수 있습니다." };

  const mapBan = formData.get("mapBan") === "on";
  const heroBan = formData.get("heroBan") === "on";

  const { error } = await supabase.rpc("open_balance_session_series", {
    p_clan_id: clanId,
    p_map_ban: mapBan,
    p_hero_ban: heroBan,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 열린 내전 세션이 있습니다." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

type BalanceRound = Database["public"]["Tables"]["balance_sessions"]["Row"];
type BalanceClient = Awaited<ReturnType<typeof createClient>>;

async function withPrematchRound(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  manager: boolean,
  work: (
    client: BalanceClient,
    round: BalanceRound,
    userId: string,
  ) => Promise<void>,
): Promise<BalanceSessionActionResult> {
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    if (
      manager &&
      !(await canManageRound(client, user.id, clanId, sessionId))
    )
      throw new Error("운영진만 진행할 수 있습니다.");
    const { data: round, error } = await client
      .from("balance_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("clan_id", clanId)
      .is("closed_at", null)
      .maybeSingle();
    if (
      error ||
      !round ||
      round.phase === "match_live" ||
      round.match_outcome !== "pending"
    )
      throw new Error("경기 시작 전 라운드에서만 변경할 수 있습니다.");
    const { data: game } = await client
      .from("games")
      .select("slug")
      .eq("id", round.game_id)
      .single();
    if (game?.slug !== gameSlug)
      throw new Error("게임 정보가 올바르지 않습니다.");
    await work(client, round, user.id);
    revalidatePath(balancePath(gameSlug, clanId));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "라운드를 변경하지 못했습니다.",
    };
  }
}

/** The read snapshot includes ballot identity as well as rule/formation revision. */
async function savePrematchRound(
  client: BalanceClient,
  round: BalanceRound,
  patch: Database["public"]["Tables"]["balance_sessions"]["Update"],
): Promise<void> {
  let query = client
    .from("balance_sessions")
    .update(patch)
    .eq("id", round.id)
    .eq("clan_id", round.clan_id)
    .is("closed_at", null)
    .eq("phase", round.phase)
    .eq("formation_revision", round.formation_revision);
  query =
    round.map_ban_deadline_at === null
      ? query.is("map_ban_deadline_at", null)
      : query.eq("map_ban_deadline_at", round.map_ban_deadline_at);
  query =
    round.hero_ban_deadline_at === null
      ? query.is("hero_ban_deadline_at", null)
      : query.eq("hero_ban_deadline_at", round.hero_ban_deadline_at);
  query =
    round.resolved_map_label === null
      ? query.is("resolved_map_label", null)
      : query.eq("resolved_map_label", round.resolved_map_label);
  query =
    round.banned_heroes === null
      ? query.is("banned_heroes", null)
      : query.not("banned_heroes", "is", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data)
    throw new Error(
      "라운드 상태가 변경되었습니다. 최신 화면에서 다시 시도하세요.",
    );
}

export async function startMapBanPhaseAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  selectedMapTypes?: string[],
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, initialRound) => {
      let round = initialRound;
      if (round.phase !== "editing" || !round.map_ban_enabled)
        throw new Error("맵 밴을 시작할 수 없는 상태입니다.");
      const bans = parseBanSettings(round);
      if (selectedMapTypes !== undefined) {
        const candidateBans = {
          ...bans,
          mapTypes: selectedMapTypes as BanSettings["mapTypes"],
        };
        const error = validateBanSettings(candidateBans);
        if (error) throw new Error(error);
        if (!sameBanSettings(bans, candidateBans)) {
          const { data: saved, error: saveError } = await client.rpc(
            "set_balance_prematch_settings",
            {
              p_round_id: round.id,
              p_clan_id: clanId,
              p_revision: round.formation_revision,
              p_settings: round.formation_settings,
              p_map_ban: round.map_ban_enabled,
              p_hero_ban: round.hero_ban_enabled,
              p_map_ban_seconds: bans.mapBanSeconds,
              p_hero_ban_seconds: bans.heroBanSeconds,
              p_map_types: selectedMapTypes,
            },
          );
          if (saveError) throw new Error(saveError.message);
          if (!saved)
            throw new Error(
              "설정이 변경되었습니다. 최신 화면에서 다시 시도하세요.",
            );
          // The settings write is a separate CAS; a concurrent start/settings edit
          // must not be silently adopted when committing this ballot.
          round = {
            ...round,
            map_types: [...selectedMapTypes].sort(),
            formation_revision: round.formation_revision + 1,
            map_candidates: null,
            map_ban_deadline_at: null,
            resolved_map_label: null,
            hero_ban_deadline_at: null,
            banned_heroes: null,
          };
        }
      }
      const candidates = pickThreeMapCandidates(
        gameSlug,
        parseBanSettings(round).mapTypes,
      );
      if (candidates.length !== 3)
        throw new Error("선택한 유형에 맵 후보가 3개 이상 필요합니다.");
      await savePrematchRound(client, round, {
        phase: "map_ban",
        map_candidates: candidates,
        resolved_map_label: null,
        map_ban_deadline_at: new Date(
          Date.now() + round.map_ban_seconds * 1000,
        ).toISOString(),
        hero_ban_deadline_at: null,
        banned_heroes: null,
        prediction_deadline_at: null,
      });
    },
  );
}

export async function selectBalanceMapAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  mapLabel: string,
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, round) => {
      if (round.map_ban_enabled)
        throw new Error("맵 밴을 끈 뒤 직접 맵을 선택하세요.");
      if (
        typeof mapLabel !== "string" ||
        !mapPoolForGameSlug(gameSlug).includes(mapLabel)
      )
        throw new Error("이 게임의 맵 목록에서 선택하세요.");
      if (round.resolved_map_label === mapLabel) return;
      // The DB invalidates a hero ballot/result only when this map changes.
      await savePrematchRound(client, round, {
        resolved_map_label: mapLabel,
        map_ban_deadline_at: null,
      });
    },
  );
}

export async function startHeroBanPhaseAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, round) => {
      if (
        !round.hero_ban_enabled ||
        !isOverwatchBalanceGame(gameSlug) ||
        !["editing", "map_ban"].includes(round.phase) ||
        !round.resolved_map_label?.trim() ||
        round.map_ban_deadline_at
      )
        throw new Error("맵을 먼저 선택하거나 확정한 뒤 영웅 밴을 시작하세요.");
      await savePrematchRound(client, round, {
        phase: "hero_ban",
        banned_heroes: null,
        hero_ban_deadline_at: new Date(
          Date.now() + round.hero_ban_seconds * 1000,
        ).toISOString(),
        prediction_deadline_at: null,
      });
    },
  );
}

export async function startBalanceMatchAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, round) => {
      if (!round.resolved_map_label?.trim() || round.map_ban_deadline_at)
        throw new Error("경기를 시작하기 전에 맵을 선택하거나 확정하세요.");
      if (
        round.hero_ban_enabled &&
        (round.banned_heroes === null || round.hero_ban_deadline_at)
      )
        throw new Error("영웅 밴을 먼저 완료하세요.");
      await savePrematchRound(client, round, {
        phase: "match_live",
        prediction_deadline_at: computeBalancePredictionDeadlineIso(),
      });
    },
  );
}

/** Compatibility for older callers: this explicit button still requires a map. */
export async function skipMapBanToMatchLiveAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  const client = await createClient();
  const { data: round } = await client
    .from("balance_sessions")
    .select("map_ban_enabled, hero_ban_enabled, banned_heroes")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();
  if (!round || round.map_ban_enabled)
    return { ok: false, error: "맵 밴을 건너뛸 수 없습니다." };
  return round.hero_ban_enabled && round.banned_heroes === null
    ? startHeroBanPhaseAction(gameSlug, clanId, sessionId)
    : startBalanceMatchAction(gameSlug, clanId, sessionId);
}

export async function submitMapVoteAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  choiceIdx: number,
  expectedDeadline: string,
): Promise<BalanceSessionActionResult> {
  if (!Number.isInteger(choiceIdx) || choiceIdx < 0 || choiceIdx > 2)
    return { ok: false, error: "잘못된 선택입니다." };
  if (typeof expectedDeadline !== "string" || !Number.isFinite(Date.parse(expectedDeadline)))
    return { ok: false, error: "최신 맵 투표 화면을 확인하세요." };
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    false,
    async (client, round) => {
      if (
        round.phase !== "map_ban" ||
        round.resolved_map_label !== null ||
        !round.map_ban_deadline_at ||
        Date.parse(round.map_ban_deadline_at) <= Date.now()
      )
        throw new Error("맵 투표가 마감되었습니다.");
      const { error } = await client.rpc("submit_balance_ban_vote", {
        p_round_id: sessionId, p_clan_id: clanId, p_kind: "map",
        p_expected_deadline: expectedDeadline, p_choice_idx: choiceIdx,
      });
      if (error) throw new Error(error.message);
    },
  );
}

export async function resolveMapBanAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, round) => {
      if (
        round.phase !== "map_ban" ||
        round.resolved_map_label !== null ||
        !round.map_ban_deadline_at
      )
        throw new Error("확정할 맵 투표가 없습니다.");
      if (Date.parse(round.map_ban_deadline_at) > Date.now())
        throw new Error("맵 투표 마감 후 확정하세요.");
      const candidates = round.map_candidates;
      if (!candidates || candidates.length !== 3)
        throw new Error("맵 후보가 없습니다.");
      const { data: votes, error } = await client
        .from("balance_session_map_votes")
        .select("choice_idx")
        .eq("session_id", sessionId);
      if (error) throw new Error(error.message);
      const winIdx = weightedPickMapIndex(tallyMapVotes(votes ?? []));
      await savePrematchRound(client, round, {
        resolved_map_label: candidates[winIdx] ?? candidates[0],
        map_ban_deadline_at: null,
      });
    },
  );
}

export async function submitHeroBanVoteAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  pick1: string,
  pick2: string,
  pick3: string,
  expectedDeadline: string,
): Promise<BalanceSessionActionResult> {
  if (!isOverwatchBalanceGame(gameSlug))
    return {
      ok: false,
      error: "이 게임에서는 영웅 밴 투표를 지원하지 않습니다.",
    };
  if (typeof expectedDeadline !== "string" || !Number.isFinite(Date.parse(expectedDeadline)))
    return { ok: false, error: "최신 영웅 밴 투표 화면을 확인하세요." };
  if ([pick1, pick2, pick3].some((pick) => typeof pick !== "string"))
    return { ok: false, error: "알 수 없는 영웅입니다." };
  const picks = [pick1.trim(), pick2.trim(), pick3.trim()];
  if (new Set(picks).size !== 3)
    return { ok: false, error: "서로 다른 영웅 3명을 선택하세요." };
  if (picks.some((pick) => !isValidOwHeroId(pick)))
    return { ok: false, error: "알 수 없는 영웅입니다." };
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    false,
    async (client, round, userId) => {
      if (
        round.phase !== "hero_ban" ||
        round.banned_heroes !== null ||
        !round.hero_ban_deadline_at ||
        Date.parse(round.hero_ban_deadline_at) <= Date.now()
      )
        throw new Error("영웅 밴 투표가 마감되었습니다.");
      if (!rosterAssignedUserIds(parseRoster(round.roster)).includes(userId))
        throw new Error("출전 라인업에 포함된 멤버만 투표할 수 있습니다.");
      const { error } = await client.rpc("submit_balance_ban_vote", {
        p_round_id: sessionId, p_clan_id: clanId, p_kind: "hero",
        p_expected_deadline: expectedDeadline, p_picks: picks,
      });
      if (error) throw new Error(error.message);
    },
  );
}

export async function resolveHeroBanAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, round) => {
      if (
        round.phase !== "hero_ban" ||
        round.banned_heroes !== null ||
        !round.hero_ban_deadline_at
      )
        throw new Error("확정할 영웅 밴 투표가 없습니다.");
      if (Date.parse(round.hero_ban_deadline_at) > Date.now())
        throw new Error("영웅 밴 투표 마감 후 확정하세요.");
      const { data: votes, error } = await client
        .from("balance_session_hero_votes")
        .select("pick_1, pick_2, pick_3")
        .eq("session_id", sessionId);
      if (error) throw new Error(error.message);
      await savePrematchRound(client, round, {
        banned_heroes: resolveBannedHeroesFromScores(
          tallyHeroBanVotes(votes ?? []),
        ),
        hero_ban_deadline_at: null,
      });
    },
  );
}

export async function skipHeroBanPhaseAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  return withPrematchRound(
    gameSlug,
    clanId,
    sessionId,
    true,
    async (client, round) => {
      if (round.phase !== "hero_ban" || round.banned_heroes !== null)
        throw new Error("영웅 밴 진행 단계가 아닙니다.");
      await savePrematchRound(client, round, {
        banned_heroes: [],
        hero_ban_deadline_at: null,
      });
    },
  );
}
export async function updateBalanceRosterAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  rosterJson: string,
  expectedRevision: number,
): Promise<import("@/lib/balance/roster-autosave").RosterSaveResult> {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return { ok: false, error: "명단 버전이 올바르지 않습니다." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const can = await canManageRound(
    supabase,
    user.id,
    clanId,
    sessionId,
  );
  if (!can) return { ok: false, error: "운영진만 배치를 수정할 수 있습니다." };

  let roster: BalanceRoster;
  try {
    roster = parseRoster(JSON.parse(rosterJson) as unknown);
  } catch {
    return { ok: false, error: "배치 데이터 형식이 올바르지 않습니다." };
  }

  if (rosterHasDuplicateUsers(roster)) {
    return { ok: false, error: "같은 멤버를 두 슬롯에 둘 수 없습니다." };
  }

  const { data: pool, error: poolErr } = await supabase.rpc(
    "list_balance_roster_pool",
    { p_clan_id: clanId },
  );
  if (poolErr) return { ok: false, error: poolErr.message };

  const poolRows = pool ?? [];
  const allowed = new Set(poolRows.map((r: { user_id: string }) => r.user_id));
  for (const uid of rosterAssignedUserIds(roster)) {
    if (!allowed.has(uid)) {
      return {
        ok: false,
        error: "클랜 활동 멤버가 아닌 사용자가 포함되어 있습니다.",
      };
    }
  }

  const { data: session, error: sessErr } = await supabase
    .from("balance_sessions")
    .select("phase")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();

  if (sessErr || !session) {
    return { ok: false, error: "세션을 찾을 수 없습니다." };
  }
  if (session.phase !== "editing") {
    return { ok: false, error: "편집 단계에서만 배치를 바꿀 수 있습니다." };
  }

  const { data: saved, error: updErr } = await supabase
    .from("balance_sessions")
    .update({ roster: roster as unknown as Json })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "editing")
    .is("formation_state", null)
    .eq("formation_revision", expectedRevision)
    .select("roster, formation_revision")
    .maybeSingle();

  if (updErr) return { ok: false, error: updErr.message };
  if (!saved) {
    const { data: latest } = await supabase
      .from("balance_sessions")
      .select("roster, formation_revision, phase, formation_state, closed_at")
      .eq("id", sessionId)
      .eq("clan_id", clanId)
      .maybeSingle();
    return {
      ok: false,
      error: "다른 조작이 먼저 반영되었습니다. 내 변경은 보관되어 있습니다.",
      ...(latest
        ? {
            conflict: {
              roster: parseRoster(latest.roster),
              revision: latest.formation_revision,
              editable:
                latest.phase === "editing" &&
                latest.closed_at === null &&
                latest.formation_state === null,
            },
          }
        : {}),
    };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return {
    ok: true,
    roster: parseRoster(saved.roster),
    revision: saved.formation_revision,
  };
}

export async function updateBalanceMaSnapshotAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  maJson: string,
): Promise<BalanceSessionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [roundManager, scorePermission] = await Promise.all([
    canManageRound(supabase, user.id, clanId, sessionId),
    hasClanPermission(supabase, user.id, clanId, "edit_mscore"),
  ]);
  const canEdit = roundManager || scorePermission;
  if (!canEdit) {
    return { ok: false, error: "M점수를 편집할 권한이 없습니다." };
  }

  let partial: MaSnapshot;
  try {
    partial = parseMaSnapshot(JSON.parse(maJson) as unknown);
  } catch {
    return { ok: false, error: "점수 데이터 형식이 올바르지 않습니다." };
  }

  const { data: clan } = await supabase
    .from("clans")
    .select("subscription_tier")
    .eq("id", clanId)
    .maybeSingle();
  const allowA = clan?.subscription_tier === "premium";

  const { data: session, error: sessErr } = await supabase
    .from("balance_sessions")
    .select("phase, roster")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();

  if (sessErr || !session) {
    return { ok: false, error: "세션을 찾을 수 없습니다." };
  }
  if (session.phase !== "match_live") {
    return {
      ok: false,
      error: "경기 진행 단계에서만 점수를 기록할 수 있습니다.",
    };
  }

  const roster = parseRoster(session.roster);
  let merged = defaultMaForRoster(roster, partial);
  if (!allowA) {
    merged = Object.fromEntries(
      Object.entries(merged).map(([k, v]) => [k, { m: v.m, a: null }]),
    );
  }

  const v = validateMaSnapshot(roster, merged, { allowA });
  if (!v.ok) return { ok: false, error: v.error };

  const { error: updErr } = await supabase
    .from("balance_sessions")
    .update({ ma_snapshot: merged as unknown as Json })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "match_live");

  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

type BalanceMatchOutcome = Database["public"]["Enums"]["balance_match_outcome"];

export async function submitBalancePredictionAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  pickTeam: 1 | 2,
): Promise<BalanceSessionActionResult> {
  if (pickTeam !== 1 && pickTeam !== 2) {
    return { ok: false, error: "팀 선택이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: session, error: sessErr } = await supabase
    .from("balance_sessions")
    .select("phase, match_outcome, closed_at, prediction_deadline_at, series_id")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .maybeSingle();

  if (sessErr || !session) {
    return { ok: false, error: "세션을 찾을 수 없습니다." };
  }
  const { data: predictionRoom, error: predictionRoomError } = await supabase
    .from("balance_rooms").select("kind")
    .eq("series_id", session.series_id).eq("clan_id", clanId).maybeSingle();
  if (predictionRoomError || predictionRoom?.kind !== "regular") {
    return { ok: false, error: "승부예측은 정규 내전에서만 참여할 수 있습니다." };
  }
  if (session.closed_at) {
    return { ok: false, error: "이미 종료된 세션입니다." };
  }
  if (session.phase !== "match_live" || session.match_outcome !== "pending") {
    return { ok: false, error: "지금은 예측을 받지 않습니다." };
  }
  if (
    session.prediction_deadline_at &&
    new Date(session.prediction_deadline_at).getTime() <= Date.now()
  ) {
    return { ok: false, error: "예측 마감 시간이 지났습니다." };
  }

  const { error } = await supabase.from("balance_session_predictions").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      pick_team: pickTeam,
    },
    { onConflict: "session_id,user_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function setBalanceMatchOutcomeAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  outcome: Exclude<BalanceMatchOutcome, "pending">,
): Promise<BalanceSessionActionResult> {
  if (outcome !== "team1" && outcome !== "team2" && outcome !== "void") {
    return { ok: false, error: "결과 값이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!(await canManageRound(supabase, user.id, clanId, sessionId))) {
    return { ok: false, error: "이 내전 방의 결과를 기록할 권한이 없습니다." };
  }

  const { data, error } = await supabase.rpc("set_balance_match_outcome", {
    p_session_id: sessionId,
    p_outcome: outcome,
  });

  if (error) return { ok: false, error: error.message };

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    const code = payload?.error;
    const message =
      code === "insufficient_clan_coins"
        ? "클랜 코인이 부족합니다. 적중 보상(인원×5)만큼 풀을 채운 뒤 다시 확정해 주세요."
        : (code ?? "결과를 확정할 수 없습니다.");
    return { ok: false, error: message };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function closeBalanceSessionAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
): Promise<BalanceSessionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const can = await canManageRound(
    supabase,
    user.id,
    clanId,
    sessionId,
  );
  if (!can) return { ok: false, error: "운영진만 세션을 종료할 수 있습니다." };

  const { error } = await supabase.rpc("close_balance_session_series", {
    p_clan_id: clanId,
    p_round_id: sessionId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

/** Keep the session date and roster while starting a distinct, empty round. */
export async function nextBalanceRoundAction(
  gameSlug: string,
  clanId: string,
  currentRoundId: string,
): Promise<BalanceSessionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.rpc("next_balance_round", {
    p_clan_id: clanId,
    p_round_id: currentRoundId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}
