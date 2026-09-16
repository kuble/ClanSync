"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  advanceFormation,
  createFormation,
  type FormationCommand,
  type FormationState,
} from "@/lib/balance/formation";
import { parseRoster } from "@/lib/balance/roster-schema";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
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
      hasClanPermission(client, user.id, clanId, "manage_clan_events"),
    ]);
    if (error || !round || round.phase !== "editing")
      throw new Error("편성할 수 있는 라운드가 아닙니다.");
    if (round.formation_revision !== revision)
      throw new Error(
        "다른 조작이 먼저 반영되었습니다. 최신 화면에서 다시 시도하세요.",
      );
    const previous = round.formation_state as unknown as FormationState | null;
    let next: FormationState | null;
    let roster = parseRoster(round.roster);
    if (command.type === "start") {
      if (!manager) throw new Error("운영진만 편성을 시작할 수 있습니다.");
      if (previous) throw new Error("편성을 다시 시작하려면 초기화하세요.");
      const { data: pool, error: poolError } = await client.rpc(
        "list_balance_roster_pool",
        { p_clan_id: clanId },
      );
      if (poolError) throw new Error("출전자 명단을 확인할 수 없습니다.");
      const valid = new Set(
        (pool ?? []).map((p: { user_id: string }) => p.user_id),
      );
      next = createFormation(roster, command.setup, randomInt);
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
    const { data: saved, error: saveError } =
      await createServiceRoleClient().rpc("commit_balance_formation", {
        p_round_id: roundId,
        p_clan_id: clanId,
        p_revision: revision,
        p_actor_id: user.id,
        p_command: command.type,
        p_state: next as unknown as Json,
        p_roster: roster as unknown as Json,
      });
    if (saveError)
      throw new Error("편성을 저장하지 못했습니다. 잠시 후 다시 시도하세요.");
    if (!saved)
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
