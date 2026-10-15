"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { GuestRecord } from "@/lib/clan/participant-records";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failed = (error: string) => ({ ok: false as const, error });

export async function saveClanParticipant(input: { clanId: string; id?: string; nickname: string }) {
  if (!input || !uuid.test(input.clanId) || (input.id && !uuid.test(input.id)) || typeof input.nickname !== "string" || !input.nickname.trim() || input.nickname.trim().length > 32) return failed("닉네임을 32자 이내로 입력하세요.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  // Preserve previously saved aliases; the new UI neither requires nor edits them.
  let alias: string | null = null;
  if (input.id) {
    const current = await client.from("clan_participants").select("alias").eq("clan_id", input.clanId).eq("id", input.id).single();
    if (current.error) return failed("참가자를 찾을 수 없습니다.");
    alias = current.data.alias;
  }
  const { data, error } = await client.rpc("save_clan_participant", { p_clan_id: input.clanId, p_id: input.id ?? null, p_nickname: input.nickname.normalize("NFC").trim(), p_alias: alias });
  if (error) return failed(error.message);
  return { ok: true as const, id: data };
}

export async function loadGuestRecords(clanId: string) {
  if (!uuid.test(clanId)) return failed("클랜 정보가 올바르지 않습니다.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { data, error } = await client.rpc("list_clan_guest_records", { p_clan_id: clanId });
  if (error) return failed(error.message);
  const records: GuestRecord[] = (data ?? []).map((row: { id: string; nickname: string; user_id: string | null; played: number; last_played: string | null; recent_matches: unknown }) => ({
    id: row.id, nickname: row.nickname, userId: row.user_id, played: Number(row.played), lastPlayed: row.last_played,
    recentMatches: (Array.isArray(row.recent_matches) ? row.recent_matches : []).map((r: { id: string; day: string; map_label: string | null }) => ({ id: r.id, day: r.day, map: r.map_label })),
  }));
  return { ok: true as const, records };
}

export async function connectMemberRecords(gameSlug: string, clanId: string, userId: string, participantId: string) {
  if (![clanId, userId, participantId].every((id) => uuid.test(id)) || !/^[a-z0-9-]+$/.test(gameSlug)) return failed("참가자 정보가 올바르지 않습니다.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { error } = await client.rpc("link_clan_participant", { p_clan_id: clanId, p_user_id: userId, p_participant_id: participantId });
  if (error) return failed(error.message);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout");
  return { ok: true as const };
}

export async function disconnectMemberRecords(gameSlug: string, clanId: string, participantId: string) {
  if (![clanId, participantId].every((id) => uuid.test(id)) || !/^[a-z0-9-]+$/.test(gameSlug)) return failed("참가자 정보가 올바르지 않습니다.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { error } = await client.rpc("unlink_clan_participant", { p_clan_id: clanId, p_participant_id: participantId });
  if (error) return failed(error.message);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}`, "layout");
  return { ok: true as const };
}

export async function issueClanParticipantInvite(clanId: string, participantId: string) {
  if (!uuid.test(clanId) || !uuid.test(participantId)) return failed("참가자 정보가 올바르지 않습니다.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { data, error } = await client.rpc("issue_clan_participant_invite", { p_clan_id: clanId, p_id: participantId });
  return error ? failed(error.message) : { ok: true as const, token: data };
}

export async function requestClanParticipantLink(token: string) {
  if (!uuid.test(token)) return failed("연결 링크가 올바르지 않습니다.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { error } = await client.rpc("request_clan_participant_link", { p_token: token });
  return error ? failed(error.message) : { ok: true as const };
}

export async function reviewClanParticipantLink(requestId: string, action: "approve" | "reject" | "revoke", note: string) {
  if (!uuid.test(requestId) || !["approve", "reject", "revoke"].includes(action) || typeof note !== "string" || !note.trim() || note.trim().length > 300) return failed("확인 또는 취소 사유를 300자 이내로 입력하세요.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { error } = await client.rpc("review_clan_participant_link", { p_request_id: requestId, p_action: action, p_note: note.trim() });
  return error ? failed(error.message) : { ok: true as const };
}
