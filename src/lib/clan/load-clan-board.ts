import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { BOARD_PAGE_SIZE, type BoardKind, type BoardPost, type BoardComment } from "./board";

export async function loadClanBoard(clanId: string, kind: BoardKind, page: number) {
  const [untyped,user] = await Promise.all([getRequestClient(),getRequestUser()]);
  const client: SupabaseClient<Database> = untyped;
  const [result,names] = await Promise.all([
    client.from("clan_board_posts").select("*,clan_board_comments(count)",{count:"exact"}).eq("clan_id",clanId).eq("kind",kind)
      .order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*BOARD_PAGE_SIZE,page*BOARD_PAGE_SIZE-1),
    client.rpc("clan_peer_nicknames",{p_clan_id:clanId}),
  ]);
  if (result.error || names.error || !user) return null;
  const nicknames = new Map(names.data.map(row=>[row.user_id,row.nickname]));
  const membership = await client.rpc("select_my_clan_membership",{p_clan_id:clanId});
  if (membership.error || membership.data?.[0]?.status !== "active") return null;
  const staff = membership.data[0].role !== "member";
  return { userId:user.id, posts:result.data.map((row): BoardPost => ({
    ...row,author:row.author_id ? nicknames.get(row.author_id) ?? "이전 멤버" : "탈퇴한 멤버",
    canManage:staff || row.author_id===user.id,canReplaceImage:row.author_id===user.id,
    commentCount:row.clan_board_comments[0]?.count ?? 0,
  })),total:result.count ?? 0 };
}

export async function loadBoardArticle(clanId: string, kind: BoardKind, postId: string, commentPage: number) {
  const [untyped,user] = await Promise.all([getRequestClient(),getRequestUser()]);
  const client: SupabaseClient<Database> = untyped;
  if (!user) return null;
  const post = await client.from("clan_board_posts").select("*").eq("clan_id",clanId).eq("kind",kind).eq("id",postId).maybeSingle();
  if (post.error) throw new Error("글을 불러오지 못했습니다.");
  if (!post.data) return null;
  const [comments,reactions,mine,names,membership] = await Promise.all([
    client.from("clan_board_comments").select("*",{count:"exact"}).eq("post_id",postId).order("created_at").order("id")
      .range((commentPage-1)*50,commentPage*50-1),
    client.from("clan_board_reactions").select("*",{count:"exact",head:true}).eq("post_id",postId),
    client.from("clan_board_reactions").select("post_id").eq("post_id",postId).eq("user_id",user.id).maybeSingle(),
    client.rpc("clan_peer_nicknames",{p_clan_id:clanId}),
    client.rpc("select_my_clan_membership",{p_clan_id:clanId}),
  ]);
  if (comments.error || reactions.error || mine.error || names.error || membership.error || membership.data?.[0]?.status !== "active") throw new Error("글의 댓글과 공감을 불러오지 못했습니다.");
  const staff = membership.data[0].role !== "member";
  const nicknames = new Map(names.data.map(row=>[row.user_id,row.nickname]));
  const name = (id: string | null) => id ? nicknames.get(id) ?? "이전 멤버" : "탈퇴한 멤버";
  return {
    post:{ ...post.data,author:name(post.data.author_id),canManage:staff || post.data.author_id===user.id,canReplaceImage:post.data.author_id===user.id,commentCount:comments.count ?? 0 } satisfies BoardPost,
    comments:comments.data.map((row): BoardComment=>({...row,author:name(row.author_id),canManage:staff || row.author_id===user.id})),
    reactions:reactions.count ?? 0,liked:!!mine.data,userId:user.id,
  };
}
