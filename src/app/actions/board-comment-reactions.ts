"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { uuidPattern } from "@/lib/clan/board";
import { COMMENT_REACTIONS, type CommentReaction, type CommentReactionKind } from "@/lib/clan/comment-reactions";

type Failure = { ok: false; error: string };
const denied: Failure = { ok: false, error: "활성 클랜원만 이 댓글에 공감할 수 있습니다." };

async function commentContext(gameSlug: string, clanId: string, commentId: string) {
  if (typeof gameSlug !== "string" || !gameSlug || ![clanId, commentId].every(value => typeof value === "string" && uuidPattern.test(value))) return null;
  const client: SupabaseClient<Database> = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !await loadMainClanContext(client, user.id, gameSlug, clanId)) return null;
  const comment = await client.from("clan_board_comments").select("id,clan_board_posts!inner(clan_id)")
    .eq("id", commentId).eq("clan_board_posts.clan_id", clanId).maybeSingle();
  if (comment.error || !comment.data) return null;
  return { client };
}

export async function setBoardCommentReactionAction(gameSlug: string, clanId: string, commentId: string, kind: CommentReactionKind | null): Promise<Failure | { ok: true; reactions: CommentReaction[] }> {
  if (kind !== null && !COMMENT_REACTIONS.some(option => option.kind === kind)) return denied;
  const ctx = await commentContext(gameSlug, clanId, commentId);
  if (!ctx) return denied;
  const saved = await ctx.client.rpc("set_board_comment_reaction", { p_comment_id: commentId, ...(kind === null ? {} : { p_kind: kind }) });
  if (saved.error) return { ok: false, error: "공감을 저장하지 못했습니다. 다시 시도해 주세요." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/board`, "layout");
  const result = await ctx.client.rpc("list_board_comment_reactions", { p_comment_ids: [commentId] });
  if (result.error) return { ok: false, error: "공감 결과를 확인하지 못했습니다. 새로고침해 주세요." };
  const reactions = result.data.flatMap(row => {
    const option = COMMENT_REACTIONS.find(option => option.kind === row.kind);
    return option ? [{ kind: option.kind, count: Number(row.total), mine: row.mine }] : [];
  });
  return { ok: true, reactions };
}

export async function listBoardCommentStandardReactionPeopleAction(gameSlug: string, clanId: string, commentId: string, kind: CommentReactionKind): Promise<Failure | { ok: true; names: string[] }> {
  if (!COMMENT_REACTIONS.some(option => option.kind === kind)) return denied;
  const ctx = await commentContext(gameSlug, clanId, commentId);
  if (!ctx) return denied;
  const [people, names] = await Promise.all([
    ctx.client.from("clan_board_comment_reactions").select("user_id").eq("comment_id", commentId).eq("kind", kind).order("user_id").limit(100),
    ctx.client.rpc("clan_peer_nicknames", { p_clan_id: clanId }),
  ]);
  if (people.error || names.error) return { ok: false, error: "공감한 멤버를 불러오지 못했습니다. 다시 시도해 주세요." };
  const nicknames = new Map(names.data.map(row => [row.user_id, row.nickname]));
  return { ok: true, names: people.data.map(row => nicknames.get(row.user_id) ?? "이전 멤버").sort((a, b) => a.localeCompare(b, "ko")) };
}
