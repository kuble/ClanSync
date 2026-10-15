"use server";

import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failed = (error: string) => ({ ok: false as const, error });

export async function saveClanParticipant(input: { clanId: string; id?: string; nickname: string; alias: string }) {
  if (!input || !uuid.test(input.clanId) || (input.id && !uuid.test(input.id)) || typeof input.nickname !== "string" || !input.nickname.trim() || input.nickname.trim().length > 32 || typeof input.alias !== "string" || input.alias.trim().length > 24) return failed("닉네임은 32자, 별칭은 24자 이내로 입력하세요.");
  const client = await createClient();
  if (!(await client.auth.getUser()).data.user) return failed("로그인이 필요합니다.");
  const { data, error } = await client.rpc("save_clan_participant", { p_clan_id: input.clanId, p_id: input.id ?? null, p_nickname: input.nickname.normalize("NFC").trim(), p_alias: input.alias.normalize("NFC").trim() });
  if (error) return failed(error.code === "23505" ? "이미 사용 중인 별칭입니다. 다른 별칭을 입력하세요." : error.code === "23514" ? "미가입 참가자는 구분할 별칭도 입력하세요." : error.message);
  return { ok: true as const, id: data };
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
