import { getRequestClient } from "@/lib/supabase/request";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { EMOJI_BUCKET } from "@/lib/clan/cosmetics";
import { uuidPattern } from "@/lib/clan/board";
export async function GET(_request: Request, { params }: { params: Promise<{ clanId: string; emojiId: string }> }) {
  const { clanId, emojiId } = await params;
  if (!uuidPattern.test(clanId) || !uuidPattern.test(emojiId)) return new Response(null, { status: 404 });
  const client = await getRequestClient();
  const { data, error } = await client.from("clan_emojis").select("image_path").eq("id", emojiId).eq("clan_id", clanId).maybeSingle();
  if (error || !data) return new Response(null, { status: 404 });
  const file = await createServiceRoleClient().storage.from(EMOJI_BUCKET).download(data.image_path);
  return file.error || !file.data ? new Response(null, { status: 404 }) : new Response(file.data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" } });
}
