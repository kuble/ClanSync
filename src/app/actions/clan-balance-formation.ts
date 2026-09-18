"use server";

import { randomInt, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  advanceFormation,
  createFormation,
  parseFormationSettings,
  sameFormationSettings,
  validateFormationSettings,
  type FormationSettings,
  type Role,
  type FormationCommand,
  type FormationState,
} from "@/lib/balance/formation";
import { parseRoster } from "@/lib/balance/roster-schema";
import { ROLE_DRAW_DURATION_MS } from "@/lib/balance/draw-presentation";
import {
  parseBanSettings,
  sameBanSettings,
  validateBanSettings,
  type BanSettings,
} from "@/lib/balance/prematch";
import { canManageRound } from "@/lib/balance/room-access";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";

export async function updateFormationAction(
  gameSlug: string,
  clanId: string,
  roundId: string,
  revision: number,
  command: FormationCommand,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    // RLS restricts reads to current members, including captains.
    const [{ data: round, error }, manager] = await Promise.all([
      client
        .from("balance_sessions")
        .select("*")
        .eq("id", roundId)
        .eq("clan_id", clanId)
        .is("closed_at", null)
        .maybeSingle(),
      canManageRound(client, user.id, clanId, roundId),
    ]);
    if (error || !round || round.phase !== "editing")
      throw new Error("편성할 수 있는 라운드가 아닙니다.");
    if (command.type === "choose-item") {
      // Opposing teams choose independently. Preserve the other team's latest
      // purchase while pinning this request to the same formation and catalog.
      let current = round;
      for (let attempt = 0; attempt < 2; attempt++) {
        const state = current.formation_state as unknown as FormationState | null;
        if (!command.expectedDrawId || state?.draw?.id !== command.expectedDrawId)
          throw new Error("편성이 변경되었습니다. 최신 화면에서 아이템을 선택하세요.");
        const next = advanceFormation(state, command, { id: user.id, manager }, Date.now(), randomInt);
        const { data: saved, error: saveError } = await createServiceRoleClient().rpc("commit_balance_formation", {
          p_round_id: roundId,
          p_clan_id: clanId,
          p_revision: current.formation_revision,
          p_actor_id: user.id,
          p_command: command.type,
          p_state: next as unknown as Json,
          p_roster: next.roster as unknown as Json,
        });
        if (saveError) throw new Error("아이템 선택을 저장하지 못했습니다. 잠시 후 다시 시도하세요.");
        if (saved) {
          revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
          return { ok: true };
        }
        const { data: refreshed, error: refreshError } = await client.from("balance_sessions")
          .select("*").eq("id", roundId).eq("clan_id", clanId).is("closed_at", null).maybeSingle();
        if (refreshError || !refreshed || refreshed.phase !== "editing") break;
        current = refreshed;
      }
      throw new Error("아이템 선택이 변경되었습니다. 최신 화면에서 다시 시도하세요.");
    }
    if (command.type === "tick" && round.formation_revision !== revision) {
      revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
      return { ok: true };
    }
    if (command.type !== "start" && round.formation_revision !== revision)
      throw new Error(
        "다른 조작이 먼저 반영되었습니다. 최신 화면에서 다시 시도하세요.",
      );
    const previous = round.formation_state as unknown as FormationState | null;
    let next: FormationState | null;
    let roster = parseRoster(round.roster);
    let commitRevision = revision;
    if (command.type === "start") {
      if (!manager) throw new Error("운영진만 편성을 시작할 수 있습니다.");
      if (
        command.expectedBans?.mapBan !== round.map_ban_enabled ||
        command.expectedBans?.heroBan !== round.hero_ban_enabled
      )
        throw new Error("밴픽 규칙이 변경되었습니다. 최신 설정을 확인하세요.");
      if (previous) throw new Error("편성을 다시 시작하려면 초기화하세요.");
      const drawHistoryLength = Array.isArray(round.draw_history)
        ? round.draw_history.length
        : 0;
      if (
        !Number.isInteger(command.expectedDrawHistoryLength) ||
        command.expectedDrawHistoryLength !== drawHistoryLength
      )
        throw new Error(
          "편성 진행 이력이 변경되었습니다. 최신 화면을 확인하세요.",
        );
      if (
        !command.expectedRoster ||
        JSON.stringify(parseRoster(command.expectedRoster)) !==
          JSON.stringify(roster) ||
        !sameFormationSettings(command.setup, round.formation_settings)
      )
        throw new Error(
          "명단 또는 편성 규칙이 변경되었습니다. 최신 화면을 확인하세요.",
        );
      // A participant can save a preference while the operator's page is still
      // refreshing. Accept that newer revision only when its visible roster and
      // rules and draw history still match, then resolve fresh preferences and
      // retain the CAS. A completed start/reset cycle must invalidate old starts.
      commitRevision = round.formation_revision;
      const { data: pool, error: poolError } = await client.rpc(
        "list_balance_roster_pool",
        { p_clan_id: clanId },
      );
      if (poolError) throw new Error("출전자 명단을 확인할 수 없습니다.");
      const valid = new Set(
        (pool ?? []).map((p: { user_id: string }) => p.user_id),
      );
      const { data: resolved, error: preferenceError } =
        await createServiceRoleClient().rpc(
          "resolve_balance_role_preferences",
          { p_round_id: roundId },
        );
      if (preferenceError)
        throw new Error("선호 역할을 불러오지 못했습니다. 다시 시도하세요.");
      // Client-supplied rankings or rules are not trusted. Both are saved before
      // starting, and preference/settings changes invalidate this revision CAS.
      const settings = parseFormationSettings(round.formation_settings);
      const { data: auctionItems, error: itemsError } =
        settings.teams === "auction" && settings.auctionItemsEnabled
          ? await client.from("clan_auction_items")
              .select("id,name,description,cost")
              .eq("clan_id", clanId).eq("enabled", true)
          : { data: [], error: null };
      if (itemsError) throw new Error("경매 아이템을 불러오지 못했습니다.");
      next = createFormation(
        roster,
        { ...settings, preferences: resolved as Record<string, Role[]> },
        randomInt,
        {
          id: randomUUID(),
          startedAt: Date.now(),
          durationMs:
            settings.roles === "lottery" ? ROLE_DRAW_DURATION_MS : 4000,
          roleMode: settings.roles,
        },
        auctionItems ?? [],
      );
      if (next.players.some((p) => !valid.has(p.id)))
        throw new Error("탈퇴 또는 게임 연결이 해제된 출전자를 교체하세요.");
      roster = next.roster;
    } else if (command.type === "reset") {
      if (!manager || !previous)
        throw new Error("운영진만 편성을 초기화할 수 있습니다.");
      roster = previous.sourceRoster;
      next = null;
    } else {
      if (!previous) throw new Error("편성을 먼저 시작하세요.");
      next = advanceFormation(
        previous,
        command,
        { id: user.id, manager },
        Date.now(),
        randomInt,
      );
      roster = next.roster;
    }
    // Ticks are clock wake-ups, not user inputs. Repeated/early wake-ups must
    // neither increment the revision nor keep an idle session alive.
    if (command.type === "tick" && JSON.stringify(previous) === JSON.stringify(next))
      return { ok: true };
    const { data: saved, error: saveError } =
      await createServiceRoleClient().rpc("commit_balance_formation", {
        p_round_id: roundId,
        p_clan_id: clanId,
        p_revision: commitRevision,
        p_actor_id: user.id,
        p_command: command.type,
        p_state: next as unknown as Json,
        p_roster: roster as unknown as Json,
      });
    if (saveError)
      throw new Error("편성을 저장하지 못했습니다. 잠시 후 다시 시도하세요.");
    if (!saved && command.type !== "tick")
      throw new Error(
        "라운드가 변경되었습니다. 최신 화면에서 다시 시도하세요.",
      );
    revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "편성 처리 중 오류가 발생했습니다.",
    };
  }
}

export async function updateFormationSettingsAction(
  gameSlug: string,
  clanId: string,
  roundId: string,
  revision: number,
  settings: FormationSettings,
  mapBan: boolean,
  heroBan: boolean,
  expectedRules: {
    settings: FormationSettings;
    mapBan: boolean;
    heroBan: boolean;
    banSettings?: BanSettings;
  },
  banSettings?: BanSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    validateFormationSettings(settings);
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    const { data: round } = await client
      .from("balance_sessions")
      .select(
        "id, formation_settings, map_ban_enabled, hero_ban_enabled, map_ban_seconds, hero_ban_seconds, hero_bans_per_team, map_types",
      )
      .eq("id", roundId)
      .eq("clan_id", clanId)
      .maybeSingle();
    if (!round) throw new Error("라운드를 찾을 수 없습니다.");
    if (settings.predictionEnabled !== parseFormationSettings(round.formation_settings).predictionEnabled) {
      const { data: clan } = await client.from("clans").select("subscription_tier").eq("id", clanId).maybeSingle();
      if (clan?.subscription_tier !== "premium")
        throw new Error("승부예측 설정은 Premium 클랜에서만 변경할 수 있습니다.");
    }
    if (
      !expectedRules ||
      !sameFormationSettings(
        round.formation_settings,
        expectedRules.settings,
      ) ||
      round.map_ban_enabled !== expectedRules.mapBan ||
      round.hero_ban_enabled !== expectedRules.heroBan ||
      (expectedRules.banSettings &&
        !sameBanSettings(parseBanSettings(round), expectedRules.banSettings))
    )
      throw new Error(
        "다른 운영진이 규칙을 변경했습니다. 설정을 다시 열어 확인하세요.",
      );
    const safeSettings = {
      roles: settings.roles,
      teams: settings.teams,
      auctionBudget: settings.auctionBudget,
      minBid: settings.minBid,
      durationSeconds: settings.durationSeconds,
      auctionItemsEnabled: settings.auctionItemsEnabled,
      strategySeconds: settings.strategySeconds,
      showPlayerCardScore: settings.showPlayerCardScore,
      showPlayerCardInfo: settings.showPlayerCardInfo,
      showTeamComparisonSummary: settings.showTeamComparisonSummary,
      showPlayerSessionSummary: settings.showPlayerSessionSummary,
      predictionEnabled: settings.predictionEnabled,
      playerCardInfo: settings.playerCardInfo,
      ...(settings.captains ? { captains: settings.captains } : {}),
    };
    const nextBans = banSettings ?? parseBanSettings(round);
    const banError = validateBanSettings(nextBans);
    if (banError) throw new Error(banError);
    const { data, error } = await client.rpc("set_balance_prematch_settings", {
      p_round_id: roundId,
      p_clan_id: clanId,
      p_revision: revision,
      p_settings: safeSettings,
      p_map_ban: mapBan,
      p_hero_ban: heroBan,
      p_map_ban_seconds: nextBans.mapBanSeconds,
      p_hero_ban_seconds: nextBans.heroBanSeconds,
      p_hero_bans_per_team: nextBans.heroBansPerTeam,
      p_map_types: nextBans.mapTypes,
    });
    if (error) throw new Error(error.message);
    if (!data)
      throw new Error(
        "명단 또는 편성 상태가 바뀌었습니다. 최신 화면에서 다시 설정하세요.",
      );
    revalidatePath(`/games/${gameSlug}/clan/${clanId}/balance`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "설정을 저장하지 못했습니다.",
    };
  }
}
