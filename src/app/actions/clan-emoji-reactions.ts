"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { uuidPattern } from "@/lib/clan/board";
import type { EmojiReactionTarget } from "@/lib/clan/emoji-text";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
export async function setClanEmojiReaction(gameSlug: string, clanId: string, postId: string, emojiId: string, active: boolean) {
  return setClanEmojiTargetReaction(gameSlug,clanId,{kind:"post",id:postId},emojiId,active);
}
export async function setClanEmojiTargetReaction(gameSlug: string, clanId: string, target: EmojiReactionTarget, emojiId: string, active: boolean) {
  if (!target || !["post","board_comment","hof_comment","notice"].includes(target.kind) || ![clanId,target.id,emojiId].every(value => typeof value === "string" && uuidPattern.test(value)) || typeof active !== "boolean") return { ok: false, error: "공감 정보를 확인해 주세요." };
  const client:SupabaseClient<Database> = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !await loadMainClanContext(client, user.id, gameSlug, clanId)) return { ok: false, error: "활성 클랜원만 사용할 수 있습니다." };
  const post = target.kind === "post" ? await client.from("clan_board_posts").select("id").eq("id",target.id).eq("clan_id",clanId).maybeSingle()
    : target.kind === "board_comment" ? await client.from("clan_board_comments").select("id,clan_board_posts!inner(clan_id)").eq("id",target.id).eq("clan_board_posts.clan_id",clanId).maybeSingle()
    : target.kind === "hof_comment" ? await client.from("clan_hof_comments").select("id").eq("id",target.id).eq("clan_id",clanId).maybeSingle()
    : await client.from("clan_notices").select("id").eq("id",target.id).eq("clan_id",clanId).maybeSingle();
  if (!post.data || post.error) return { ok: false, error: "게시글을 확인해 주세요." };
  const column = target.kind === "post" ? "post_id" : target.kind === "board_comment" ? "board_comment_id" : target.kind === "hof_comment" ? "hof_comment_id" : "notice_id";
  const values:Database["public"]["Tables"]["clan_emoji_reactions"]["Insert"]={emoji_id:emojiId};
  values[column]=target.id;
  const result = active ? await client.from("clan_emoji_reactions").insert(values) : await client.from("clan_emoji_reactions").delete().eq(column,target.id).eq("emoji_id",emojiId).eq("user_id",user.id);
  if (result.error && result.error.code !== "23505") return { ok: false, error: "이 클랜에서 사용 가능한 이모티콘을 선택해 주세요." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/board`, "layout");
  const args:Database["public"]["Functions"]["list_clan_emoji_reactions"]["Args"]={};
  const argument=target.kind==="post"?"p_post_ids":target.kind==="board_comment"?"p_board_comment_ids":target.kind==="hof_comment"?"p_hof_comment_ids":"p_notice_ids";
  args[argument]=[target.id];
  const list = await client.rpc("list_clan_emoji_reactions",args);
  if(list.error)return {ok:false,error:"공감 결과를 확인하지 못했습니다. 새로고침해 주세요."};
  return { ok: true, reactions:list.data.map(row=>({emoji_id:row.emoji_id,total:Number(row.total),mine:row.mine})) };
}
