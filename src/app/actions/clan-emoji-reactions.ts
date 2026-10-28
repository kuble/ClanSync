"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { uuidPattern } from "@/lib/clan/board";
export async function setClanEmojiReaction(gameSlug: string, clanId: string, postId: string, emojiId: string, active: boolean) {
  if (![clanId, postId, emojiId].every(value => uuidPattern.test(value)) || typeof active !== "boolean") return { ok: false, error: "공감 정보를 확인해 주세요." };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !await loadMainClanContext(client, user.id, gameSlug, clanId)) return { ok: false, error: "활성 클랜원만 사용할 수 있습니다." };
  const post = await client.from("clan_board_posts").select("id").eq("id", postId).eq("clan_id", clanId).maybeSingle();
  if (!post.data || post.error) return { ok: false, error: "게시글을 확인해 주세요." };
  const result = active ? await client.from("clan_emoji_reactions").insert({ post_id: postId, emoji_id: emojiId }) : await client.from("clan_emoji_reactions").delete().eq("post_id", postId).eq("emoji_id", emojiId).eq("user_id", user.id);
  if (result.error && result.error.code !== "23505") return { ok: false, error: "이 클랜에서 사용 가능한 이모티콘을 선택해 주세요." };
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/board`, "layout");
  return { ok: true };
}
