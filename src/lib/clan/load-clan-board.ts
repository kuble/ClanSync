import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import {getRequestClanAccess} from "./request-clan-access";
import {loadClanPeerNames} from "./load-clan-peer-names";
import { BOARD_PAGE_SIZE, type BoardKind, type BoardPost, type BoardComment, type BoardListPost } from "./board";
import { COMMENT_REACTIONS } from "./comment-reactions";
type ListRow=Pick<Database["public"]["Tables"]["clan_board_posts"]["Row"],"id"|"title"|"details"|"status"|"image_path"|"created_at"|"author_id"|"coach_id">&{content?:string;clan_board_comments?:{count:number}[]};

export async function loadClanBoard(clanId: string, kind: BoardKind, page: number) {
  const [untyped,user,access] = await Promise.all([getRequestClient(),getRequestUser(),getRequestClanAccess(clanId)]);
  const client: SupabaseClient<Database> = untyped;
  if(!user||access.membership?.status!=="active")return null;
  const [result,names] = await Promise.all([
    client.from("clan_board_posts").select(kind==="memories"?"id,title,content,details,status,image_path,created_at,author_id,coach_id":kind==="channels"?"id,title,details,status,image_path,created_at,author_id,coach_id":"id,title,details,status,image_path,created_at,author_id,coach_id,clan_board_comments(count)",{count:"exact"}).eq("clan_id",clanId).eq("kind",kind)
      .order("created_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*BOARD_PAGE_SIZE,page*BOARD_PAGE_SIZE-1).overrideTypes<ListRow[],{merge:false}>(),
    loadClanPeerNames(clanId),
  ]);
  if (result.error || names.error || !user) return null;
  const nicknames = new Map(names.data.map(row=>[row.user_id,row.nickname]));
  return { userId:user.id, posts:result.data.map((row): BoardListPost => ({
    id:row.id,title:row.title,details:row.details,status:row.status,image_path:row.image_path,created_at:row.created_at,
    content:"content" in row&&typeof row.content==="string"?row.content.slice(0,100):"",
    author:row.author_id ? nicknames.get(row.author_id) ?? "이전 멤버" : "탈퇴한 멤버",
    commentCount:row.clan_board_comments?.[0]?.count??0,coachName:row.coach_id?nicknames.get(row.coach_id)??"이전 선생님":undefined,
  })),total:result.count ?? 0 };
}

export async function loadBoardArticle(clanId: string, kind: BoardKind, postId: string, commentPage: number) {
  const [untyped,user,access] = await Promise.all([getRequestClient(),getRequestUser(),getRequestClanAccess(clanId)]);
  const client: SupabaseClient<Database> = untyped;
  if (!user||access.membership?.status!=="active") return null;
  const post = await client.from("clan_board_posts").select("*").eq("clan_id",clanId).eq("kind",kind).eq("id",postId).maybeSingle();
  if (post.error) throw new Error("글을 불러오지 못했습니다.");
  if (!post.data) return null;
  const [comments,reactions,mine,names,previous,next] = await Promise.all([
    client.from("clan_board_comments").select("*",{count:"exact"}).eq("post_id",postId).order("created_at").order("id")
      .range((commentPage-1)*50,commentPage*50-1),
    client.from("clan_board_reactions").select("*",{count:"exact",head:true}).eq("post_id",postId),
    client.from("clan_board_reactions").select("post_id").eq("post_id",postId).eq("user_id",user.id).maybeSingle(),
    loadClanPeerNames(clanId),
    client.from("clan_board_posts").select("id").eq("clan_id",clanId).eq("kind",kind)
      .or(`created_at.gt.${post.data.created_at},and(created_at.eq.${post.data.created_at},id.gt.${postId})`)
      .order("created_at",{ascending:true}).order("id",{ascending:true}).limit(1).maybeSingle(),
    client.from("clan_board_posts").select("id").eq("clan_id",clanId).eq("kind",kind)
      .or(`created_at.lt.${post.data.created_at},and(created_at.eq.${post.data.created_at},id.lt.${postId})`)
      .order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if (comments.error || reactions.error || mine.error || names.error || previous.error || next.error) throw new Error("글의 댓글과 공감을 불러오지 못했습니다.");
  const ids=comments.data.map(row=>row.id);
  const [custom,standard] = await Promise.all([
    client.rpc("list_clan_emoji_reactions",{p_board_comment_ids:ids}),
    client.rpc("list_board_comment_reactions",{p_comment_ids:ids}),
  ]);
  if(custom.error||standard.error)throw new Error("댓글 공감을 불러오지 못했습니다.");
  const staff = access.membership.role !== "member";
  const nicknames = new Map(names.data.map(row=>[row.user_id,row.nickname]));
  const name = (id: string | null) => id ? nicknames.get(id) ?? "이전 멤버" : "탈퇴한 멤버";
  return {
    post:{ ...post.data,content:kind==="channels"?"":post.data.content,author:name(post.data.author_id),canManage:staff || post.data.author_id===user.id,canReplaceImage:post.data.author_id===user.id,commentCount:comments.count ?? 0,coachName:post.data.coach_id?name(post.data.coach_id):undefined,canSetStatus:staff||post.data.author_id===user.id||post.data.coach_id===user.id,canSetChannelLive:kind==="channels"&&post.data.author_id===user.id } satisfies BoardPost,
    comments:comments.data.map((row): BoardComment=>({...row,author:name(row.author_id),canManage:staff || row.author_id===user.id,
      reactions:standard.data.filter(r=>r.comment_id===row.id).flatMap(r=>{const option=COMMENT_REACTIONS.find(option=>option.kind===r.kind);return option?[{kind:option.kind,count:Number(r.total),mine:r.mine}]:[];}),
      emojiReactions:custom.data.filter(r=>r.target_id===row.id).map(r=>({emoji_id:r.emoji_id,total:Number(r.total),mine:r.mine}))})),
    reactions:reactions.count ?? 0,liked:!!mine.data,userId:user.id,previousPostId:previous.data?.id??null,nextPostId:next.data?.id??null,
  };
}
