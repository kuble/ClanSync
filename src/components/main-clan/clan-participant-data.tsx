import { createServiceRoleClient } from "@/lib/supabase/service";
import { getRequestClient } from "@/lib/supabase/request";
import { ClanParticipantManagement, type ParticipantLinkRow } from "./clan-participant-management";

/** Mounted only inside the officer-authorized management page. */
export async function ClanParticipantData({ clanId, gameSlug }: { clanId: string; gameSlug: string }) {
  const client = await getRequestClient();
  const participants = [];
  const requests = [];
  for (let offset = 0; ; offset += 500) {
    const [p, r] = await Promise.all([
      client.from("clan_participants").select("id,nickname,alias,is_guest,user_id").eq("clan_id", clanId).order("created_at").order("id").range(offset, offset + 499),
      client.from("clan_participant_links").select("*").eq("clan_id", clanId).order("requested_at", { ascending: false }).order("id").range(offset, offset + 499),
    ]);
    if (p.error || r.error) throw new Error("참가자 명부와 연결 이력을 불러오지 못했습니다.");
    participants.push(...p.data); requests.push(...r.data);
    if (p.data.length < 500 && r.data.length < 500) break;
  }
  const ids = [...new Set([...participants.flatMap((p) => p.user_id ? [p.user_id] : []), ...requests.flatMap((r) => [r.requested_by, r.reviewed_by, r.revoked_by].filter((id): id is string => !!id))])];
  const names = new Map<string, string>();
  const svc = createServiceRoleClient();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const { data, error } = await svc.from("users").select("id,nickname").in("id", ids.slice(offset, offset + 200));
    if (error) throw new Error("연결 계정 정보를 불러오지 못했습니다.");
    data.forEach((u) => names.set(u.id, u.nickname));
  }
  return <ClanParticipantManagement clanId={clanId} gameSlug={gameSlug} participants={participants.map((p) => ({ id: p.id, nickname: !p.is_guest && p.user_id ? names.get(p.user_id) ?? p.nickname : p.nickname, alias: p.alias, isGuest: p.is_guest, userId: p.user_id, accountName: p.user_id ? names.get(p.user_id) ?? null : null }))}
    requests={requests.map((r): ParticipantLinkRow => ({ id: r.id, participantId: r.participant_id, requester: names.get(r.requested_by) ?? "탈퇴한 계정", requesterId: r.requested_by, status: r.status as ParticipantLinkRow["status"], requestedAt: r.requested_at, reviewedAt: r.reviewed_at, reviewer: names.get(r.reviewed_by ?? "") ?? null, reviewNote: r.review_note, revokedAt: r.revoked_at, revoker: names.get(r.revoked_by ?? "") ?? null, revokeNote: r.revoke_note }))} />;
}
