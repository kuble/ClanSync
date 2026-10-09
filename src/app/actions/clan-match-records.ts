"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { readClanAccessSnapshot, resolveClanPermission } from "@/lib/clan/clan-access-snapshot";
import { loadClanStatsArchive } from "@/lib/clan/stats/load-clan-stats";
import type { Json } from "@/lib/supabase/database.types";

export type MatchRecordInput = {
  playedAt: string; occurredAt: string; mapLabel: string; outcome: "team1" | "team2" | "draw" | "void" | "unrecorded";
  players: { userId: string; team: number; role: "tank" | "dmg" | "sup" | null }[];
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function editClanMatchRecord(input: {
  clanId: string; id?: string; operation: "create" | "update" | "delete"; revision?: string; day: string; record?: MatchRecordInput;
}) {
  if (!input || !UUID.test(input.clanId) || (input.id && !UUID.test(input.id)) || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)
    || !["create", "update", "delete"].includes(input.operation)) return { ok: false as const, error: "경기 기록 정보가 올바르지 않습니다." };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const access = await readClanAccessSnapshot(client, input.clanId);
  const membership = access.membership;
  if (!membership || membership.status !== "active" || !resolveClanPermission(membership.role, "correct_match_records", access.permissions)
    || !resolveClanPermission(membership.role, "view_match_records", access.permissions)) return { ok: false as const, error: "경기 기록을 정정할 권한이 없습니다." };
  const r = input.record;
  if (input.operation !== "delete" && (!r || !["team1", "team2", "draw", "void", "unrecorded"].includes(r.outcome)
    || typeof r.mapLabel !== "string" || r.mapLabel.length > 64 || !Number.isFinite(Date.parse(r.playedAt)) || !Number.isFinite(Date.parse(r.occurredAt))
    || !Array.isArray(r.players) || r.players.length < 2 || r.players.length > 10
    || r.players.some((p) => !p || !UUID.test(p.userId) || ![1, 2].includes(p.team) || ![null, "tank", "dmg", "sup"].includes(p.role)))) return { ok: false as const, error: "날짜·맵·결과와 양 팀의 출전자를 확인하세요." };
  const { error } = await createServiceRoleClient().rpc("edit_clan_match_record", {
    p_clan_id: input.clanId, p_actor_id: user.id, p_id: input.id ?? null, p_operation: input.operation,
    p_revision: input.revision ?? null, p_record: (r ?? null) as unknown as Json,
  });
  if (error) return { ok: false as const, error: error.code === "PT409" ? input.operation === "create" ? "이미 저장된 기록입니다. 최신 기록을 확인하세요." : "다른 관리자가 수정한 기록입니다. 최신 기록을 불러온 후 다시 수정하세요."
    : error.code === "42501" ? "권한 또는 출전자 소속을 확인하세요." : "기록을 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도하세요." };
  // The RPC commits the changed day and every affected summary together.
  // Return a fresh directory plus the selected day; update the mounted UI in place.
  const [directory, day] = await Promise.all([loadClanStatsArchive(client, input.clanId), loadClanStatsArchive(client, input.clanId, input.day)]);
  if (directory?.kind !== "archive" || day?.kind !== "archive") return { ok: false as const, error: "저장은 완료됐지만 기록 조회 권한이 변경됐습니다. 페이지를 새로고침하세요." };
  return { ok: true as const, archive: { ...directory.archive, sampleByDate: { ...directory.archive.sampleByDate, [input.day]: day.archive.sampleByDate[input.day] ?? [] } } };
}
