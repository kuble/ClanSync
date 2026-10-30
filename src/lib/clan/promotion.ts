import type { Json } from "@/lib/supabase/database.types";

export const PROMOTION_IMAGE_BUCKET = "clan-promotion-images";
export const PROMOTION_IMAGE_LIMIT = 5 * 1024 * 1024;
export const PROMOTION_IMAGE_COUNT = 6;
export type PromotionBlock = { type: "text"; text: string } | { type: "image"; path: string; alt: string };
export type PromotionPost = { id: string; title: string; content: string; content_blocks: Json; created_at: string; updated_at: string };
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const promotionImagePath = new RegExp(`^${uuid}/${uuid}/${uuid}/${uuid}\\.webp$`);

export function parsePromotionBlocks(value: unknown): PromotionBlock[] | null {
  if (!Array.isArray(value) || value.length > 25) return null;
  const result: PromotionBlock[] = [];
  for (const block of value) {
    if (!block || typeof block !== "object") return null;
    if (block.type === "text" && typeof block.text === "string") result.push({ type: "text", text: block.text });
    else if (block.type === "image" && typeof block.path === "string" && promotionImagePath.test(block.path) && typeof block.alt === "string" && block.alt.length <= 160) result.push({ type: "image", path: block.path, alt: block.alt });
    else return null;
  }
  if (result.filter(block => block.type === "image").length > PROMOTION_IMAGE_COUNT || promotionText(result).length > 8000) return null;
  return result;
}
export function promotionText(blocks: PromotionBlock[]) {
  return blocks.flatMap(block => block.type === "text" ? [block.text] : []).join("\n\n").trim();
}
export function promotionBlocks(post?: { content: string; content_blocks?: unknown } | null): PromotionBlock[] {
  const blocks = parsePromotionBlocks(post?.content_blocks);
  return blocks?.length ? blocks : [{ type: "text", text: post?.content ?? "" }];
}
export function promotionImageUrl(gameSlug: string, clanId: string, path: string) {
  return `/api/games/${encodeURIComponent(gameSlug)}/clans/${clanId}/promotion-images?path=${encodeURIComponent(path)}`;
}
