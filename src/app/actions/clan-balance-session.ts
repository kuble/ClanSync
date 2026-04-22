"use server";

import { revalidatePath } from "next/cache";
import { pickThreeMapCandidates } from "@/lib/balance/map-pools";
import {
  parseRoster,
  rosterAssignedUserIds,
  rosterHasDuplicateUsers,
  type BalanceRoster,
} from "@/lib/balance/roster-schema";
import { tallyMapVotes, weightedPickMapIndex } from "@/lib/balance/weighted-map-pick";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

type Phase = Database["public"]["Enums"]["balance_session_phase"];

export type BalanceSessionActionResult =
  | { ok: true }
  | { ok: false; error: string };

function balancePath(gameSlug: string, clanId: string): string {
  return `/games/${gameSlug}/clan/${clanId}/balance`;
}

async function loadClanGameId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clanId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("clans")
    .select("game_id")
    .eq("id", clanId)
    .maybeSingle();
  return data?.game_id ?? null;
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

  const gameId = await loadClanGameId(supabase, clanId);
  if (!gameId) return { ok: false, error: "클랜 정보를 찾을 수 없습니다." };

  const mapBan = formData.get("mapBan") === "on";
  const heroBan = formData.get("heroBan") === "on";

  const { error } = await supabase.from("balance_sessions").insert({
    clan_id: clanId,
    game_id: gameId,
    host_user_id: user.id,
    phase: "editing",
    map_ban_enabled: mapBan,
    hero_ban_enabled: heroBan,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 진행 중인 밸런스 세션이 있습니다." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function startMapBanPhaseAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
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
  if (!can) return { ok: false, error: "운영진만 진행할 수 있습니다." };

  const candidates = pickThreeMapCandidates(gameSlug);
  const deadline = new Date(Date.now() + 15_000).toISOString();

  const { data: updated, error } = await supabase
    .from("balance_sessions")
    .update({
      phase: "map_ban",
      map_candidates: candidates,
      map_ban_deadline_at: deadline,
    })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "editing")
    .eq("map_ban_enabled", true)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) {
    return { ok: false, error: "맵 밴을 시작할 수 없는 상태입니다." };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function skipMapBanToMatchLiveAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
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
  if (!can) return { ok: false, error: "운영진만 진행할 수 있습니다." };

  const { data: session } = await supabase
    .from("balance_sessions")
    .select("hero_ban_enabled")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();

  if (!session) return { ok: false, error: "세션을 찾을 수 없습니다." };

  const nextPhase: Phase = session.hero_ban_enabled ? "hero_ban" : "match_live";

  const { data: updated, error } = await supabase
    .from("balance_sessions")
    .update({
      phase: nextPhase,
      map_candidates: null,
      map_ban_deadline_at: null,
    })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "editing")
    .eq("map_ban_enabled", false)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) {
    return { ok: false, error: "이 단계를 건너뛸 수 없습니다." };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function submitMapVoteAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  choiceIdx: number,
): Promise<BalanceSessionActionResult> {
  if (choiceIdx < 0 || choiceIdx > 2) {
    return { ok: false, error: "잘못된 선택입니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: session } = await supabase
    .from("balance_sessions")
    .select("phase")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();

  if (!session || session.phase !== "map_ban") {
    return { ok: false, error: "맵 투표를 받지 않는 단계입니다." };
  }

  const { error } = await supabase.from("balance_session_map_votes").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      choice_idx: choiceIdx,
    },
    { onConflict: "session_id,user_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function resolveMapBanAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
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
  if (!can) return { ok: false, error: "운영진만 맵을 확정할 수 있습니다." };

  const { data: session, error: sessErr } = await supabase
    .from("balance_sessions")
    .select("phase, map_candidates, hero_ban_enabled")
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .maybeSingle();

  if (sessErr || !session) {
    return { ok: false, error: "세션을 찾을 수 없습니다." };
  }
  if (session.phase !== "map_ban") {
    return { ok: false, error: "맵 밴 단계가 아닙니다." };
  }

  const candidates = session.map_candidates as string[] | null;
  if (!candidates || candidates.length !== 3) {
    return { ok: false, error: "맵 후보가 없습니다." };
  }

  const { data: voteRows } = await supabase
    .from("balance_session_map_votes")
    .select("choice_idx")
    .eq("session_id", sessionId);

  const tallies = tallyMapVotes(voteRows ?? []);
  const winIdx = weightedPickMapIndex(tallies);
  const resolved = candidates[winIdx] ?? candidates[0];

  const nextPhase: Phase = session.hero_ban_enabled ? "hero_ban" : "match_live";

  const { error: updErr } = await supabase
    .from("balance_sessions")
    .update({
      phase: nextPhase,
      resolved_map_label: resolved,
      map_ban_deadline_at: null,
    })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "map_ban");

  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function skipHeroBanPhaseAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
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
  if (!can) return { ok: false, error: "운영진만 진행할 수 있습니다." };

  const { data: updated, error } = await supabase
    .from("balance_sessions")
    .update({ phase: "match_live" })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "hero_ban")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) {
    return { ok: false, error: "영웅 밴 단계가 아닙니다." };
  }

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}

export async function updateBalanceRosterAction(
  gameSlug: string,
  clanId: string,
  sessionId: string,
  rosterJson: string,
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
  const allowed = new Set(
    poolRows.map((r: { user_id: string }) => r.user_id),
  );
  for (const uid of rosterAssignedUserIds(roster)) {
    if (!allowed.has(uid)) {
      return { ok: false, error: "클랜 활동 멤버가 아닌 사용자가 포함되어 있습니다." };
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

  const { error: updErr } = await supabase
    .from("balance_sessions")
    .update({ roster: roster as unknown as Json })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .eq("phase", "editing");

  if (updErr) return { ok: false, error: updErr.message };

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

  const can = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!can) return { ok: false, error: "운영진만 세션을 종료할 수 있습니다." };

  const { data: updated, error } = await supabase
    .from("balance_sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("clan_id", clanId)
    .is("closed_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "종료할 세션을 찾을 수 없습니다." };

  revalidatePath(balancePath(gameSlug, clanId));
  return { ok: true };
}
