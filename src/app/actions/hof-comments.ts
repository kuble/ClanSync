"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { HOF_COMMENT_MAX_LENGTH, HOF_COMMENT_PAGE_SIZE, HOF_REACTIONS, validHofCommentThread, type HofComment, type HofCommentThread, type HofReaction, type HofReactionKind } from "@/lib/clan/stats/hof-comments";

type Failure = { ok: false; error: string };
type Cursor = { createdAt: string; id: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const denied: Failure = { ok: false, error: "공개된 순위에 클랜 멤버만 반응을 남길 수 있습니다." };

async function threadContext(thread: HofCommentThread) {
  if (!validHofCommentThread(thread)) return null;
  const supabase: SupabaseClient<Database> = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [access, membership] = await Promise.all([
    supabase.rpc("can_access_hof_comments", { p_clan_id: thread.clanId, p_ranking: thread.ranking, p_period_key: thread.periodKey }),
    supabase.rpc("select_my_clan_membership", { p_clan_id: thread.clanId }),
  ]);
  const member = membership.data?.[0];
  if (access.error || !access.data || membership.error || member?.status !== "active") return null;
  return { supabase, user, isStaff: member.role !== "member" };
}

export async function listHofCommentsAction(thread: HofCommentThread, cursor: Cursor | null = null): Promise<Failure | { ok: true; comments: HofComment[]; nextCursor: Cursor | null }> {
  if (cursor && (!uuid.test(cursor.id) || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.createdAt) || !Number.isFinite(Date.parse(cursor.createdAt)))) return denied;
  const ctx = await threadContext(thread);
  if (!ctx) return denied;
  let query = ctx.supabase.from("clan_hof_comments").select("id, content, author_id, created_at")
    .eq("clan_id", thread.clanId).eq("ranking", thread.ranking).eq("period_key", thread.periodKey)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(HOF_COMMENT_PAGE_SIZE + 1);
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  const [result, names] = await Promise.all([query, ctx.supabase.rpc("clan_peer_nicknames", { p_clan_id: thread.clanId })]);
  if (result.error || names.error) return { ok: false, error: "반응을 불러오지 못했습니다. 다시 시도해 주세요." };
  const nicknames = new Map(names.data.map((row) => [row.user_id, row.nickname]));
  const rows = result.data.slice(0, HOF_COMMENT_PAGE_SIZE);
  const reactions = await readReactions(ctx.supabase, rows.map((row) => row.id));
  if (!reactions) return { ok: false, error: "반응을 불러오지 못했습니다. 다시 시도해 주세요." };
  const last = rows.at(-1);
  return {
    ok: true,
    comments: rows.map((row) => ({ id: row.id, content: row.content, createdAt: row.created_at,
      nickname: row.author_id ? nicknames.get(row.author_id) ?? "이전 멤버" : "탈퇴한 멤버",
      isMine: row.author_id === ctx.user.id, canDelete: ctx.isStaff || row.author_id === ctx.user.id, reactions: reactions.get(row.id) ?? [] })),
    nextCursor: result.data.length > HOF_COMMENT_PAGE_SIZE && last ? { createdAt: last.created_at, id: last.id } : null,
  };
}

export async function addHofCommentAction(thread: HofCommentThread, content: string): Promise<Failure | { ok: true; comment: HofComment }> {
  if (typeof content !== "string" || !content.trim() || content.trim().length > HOF_COMMENT_MAX_LENGTH)
    return { ok: false, error: "댓글은 1~500자로 입력해 주세요." };
  const ctx = await threadContext(thread);
  if (!ctx) return denied;
  const { data, error } = await ctx.supabase.from("clan_hof_comments")
    .insert({ clan_id: thread.clanId, ranking: thread.ranking, period_key: thread.periodKey, content: content.trim() })
    .select("id, content, created_at").single();
  if (error) return { ok: false, error: "댓글을 등록하지 못했습니다. 다시 시도해 주세요." };
  const { data: profile } = await ctx.supabase.from("users").select("nickname").eq("id", ctx.user.id).maybeSingle();
  return { ok: true, comment: { id: data.id, content: data.content, createdAt: data.created_at, nickname: profile?.nickname ?? "나", isMine: true, canDelete: true, reactions: [] } };
}

async function readReactions(supabase: SupabaseClient<Database>, commentIds: string[]) {
  const grouped = new Map<string, HofReaction[]>();
  if (!commentIds.length) return grouped;
  const { data, error } = await supabase.rpc("list_hof_comment_reactions", { p_comment_ids: commentIds });
  if (error) return null;
  for (const row of data) {
    const option = HOF_REACTIONS.find(({ kind }) => kind === row.kind);
    if (!option) continue;
    const entries = grouped.get(row.comment_id) ?? [];
    entries.push({ kind: option.kind, count: Number(row.total), mine: row.mine });
    grouped.set(row.comment_id, entries);
  }
  return grouped;
}

export async function setHofCommentReactionAction(thread: HofCommentThread, commentId: string, kind: HofReactionKind | null): Promise<Failure | { ok: true; reactions: HofReaction[] }> {
  if (typeof commentId !== "string" || !uuid.test(commentId) || (kind !== null && !HOF_REACTIONS.some((option) => option.kind === kind))) return denied;
  const ctx = await threadContext(thread);
  if (!ctx) return denied;
  const { data: comment, error: lookupError } = await ctx.supabase.from("clan_hof_comments").select("id")
    .eq("id", commentId).eq("clan_id", thread.clanId).eq("ranking", thread.ranking).eq("period_key", thread.periodKey).maybeSingle();
  if (lookupError || !comment) return denied;
  const { error } = await ctx.supabase.rpc("set_hof_comment_reaction", { p_comment_id: commentId, ...(kind === null ? {} : { p_kind: kind }) });
  if (error) return { ok: false, error: "공감을 저장하지 못했습니다. 다시 시도해 주세요." };
  const reactions = await readReactions(ctx.supabase, [commentId]);
  if (!reactions) return { ok: false, error: "공감 결과를 확인하지 못했습니다. 새로고침으로 확인해 주세요." };
  return { ok: true, reactions: reactions.get(commentId) ?? [] };
}

export async function deleteHofCommentAction(thread: HofCommentThread, commentId: string): Promise<Failure | { ok: true }> {
  if (typeof commentId !== "string" || !uuid.test(commentId)) return denied;
  const ctx = await threadContext(thread);
  if (!ctx) return denied;
  const { data, error } = await ctx.supabase.from("clan_hof_comments").delete()
    .eq("id", commentId).eq("clan_id", thread.clanId).eq("ranking", thread.ranking).eq("period_key", thread.periodKey).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "댓글을 삭제하지 못했습니다. 권한과 댓글 상태를 확인해 주세요." };
  return { ok: true };
}
