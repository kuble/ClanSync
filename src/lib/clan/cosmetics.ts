export type ClanCosmeticAccess = { emojiSlots: number; frames: boolean; stickers: boolean };
export const NO_CLAN_COSMETICS: ClanCosmeticAccess = { emojiSlots: 0, frames: false, stickers: false };
export type ClanEmoji = { id: string; name: string };
export type ClanEmojiReaction = { emoji_id: string; total: number; mine: boolean };
export const EMOJI_BUCKET = "clan-emojis";
export const EMOJI_LIMIT = 256 * 1024;
export const emojiNamePattern = /^[a-zA-Z0-9가-힣_]{2,32}$/;
export function clanEmojiUrl(clanId: string, id: string) { return `/api/clans/${clanId}/emojis/${id}`; }
export const PHOTO_FRAMES = [{ id: "classic", label: "기본" }, { id: "film", label: "필름" }, { id: "tape", label: "마스킹 테이프" }] as const;
export const PHOTO_STICKERS = [{ id: "none", label: "없음" }, { id: "sparkle", label: "반짝" }, { id: "heart", label: "하트" }, { id: "gg", label: "GG" }] as const;
export function readCosmeticAccess(value: unknown): ClanCosmeticAccess {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { emojiSlots: row.emojiSlots === 10 ? 10 : 0, frames: row.frames === true, stickers: row.stickers === true };
}
export function clanProductKind(slug: string) {
  return slug === "clan_emoji_slots_10" ? "emojis" : slug === "clan_photo_frames" ? "frames" : slug === "clan_photo_stickers" ? "stickers" : "banner";
}
export function memoryStyle(details: { photoFrame?: string; photoSticker?: string }, access: ClanCosmeticAccess) {
  return { photoFrame: access.frames && PHOTO_FRAMES.some(f => f.id === details.photoFrame) ? details.photoFrame : "classic", photoSticker: access.stickers && PHOTO_STICKERS.some(s => s.id === details.photoSticker) ? details.photoSticker : "none" };
}
