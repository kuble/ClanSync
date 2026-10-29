import { readPhotoStickerPlacement, readPhotoStickers, type PhotoStickerPlacement, type PhotoStickerInstance } from "./photo-sticker";
export type ClanCosmeticAccess = { emojiSlots: number; frames: boolean; stickers: boolean };
export const NO_CLAN_COSMETICS: ClanCosmeticAccess = { emojiSlots: 0, frames: false, stickers: false };
export type ClanEmoji = { id: string; name: string; slot_index?: number };
export const CLAN_EMOJI_PACK_SLUG = "clan_emoji_slots_3";
export const CLAN_EMOJI_PACK_SIZE = 3;
export function isRepeatableClanProduct(slug: string) { return slug === CLAN_EMOJI_PACK_SLUG; }
export type ClanEmojiReaction = { emoji_id: string; total: number; mine: boolean };
export const EMOJI_BUCKET = "clan-emojis";
export const EMOJI_LIMIT = 256 * 1024;
export const emojiNamePattern = /^[a-zA-Z0-9가-힣_]{2,32}$/;
export function clanEmojiUrl(clanId: string, id: string) { return `/api/clans/${clanId}/emojis/${id}`; }
export const PHOTO_PACKS = [
  { id: "basic", label: "기본", kind: "both" },
  { id: "clan_photo_frames", label: "추억 사진 프레임 팩", kind: "frames" },
  { id: "clan_photo_stickers", label: "추억 사진 스티커 팩", kind: "stickers" },
] as const;
export const PHOTO_FRAMES = [{ id: "classic", label: "기본", pack: "basic" }, { id: "film", label: "필름", pack: "clan_photo_frames" }, { id: "tape", label: "마스킹 테이프", pack: "clan_photo_frames" }] as const;
export const PHOTO_STICKERS = [{ id: "none", label: "없음", pack: "basic" }, { id: "sparkle", label: "반짝", pack: "clan_photo_stickers" }, { id: "heart", label: "하트", pack: "clan_photo_stickers" }, { id: "gg", label: "GG", pack: "clan_photo_stickers" }] as const;
export function readCosmeticAccess(value: unknown): ClanCosmeticAccess {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { emojiSlots: typeof row.emojiSlots === "number" && Number.isSafeInteger(row.emojiSlots) && row.emojiSlots > 0 ? row.emojiSlots : 0, frames: row.frames === true, stickers: row.stickers === true };
}
export function clanProductKind(slug: string) {
  return isRepeatableClanProduct(slug) || slug === "clan_emoji_slots_10" ? "emojis" : slug === "clan_photo_frames" ? "frames" : slug === "clan_photo_stickers" ? "stickers" : "banner";
}
export function memoryStyle(details: { photoFrame?: string; photoSticker?: string; photoStickerPlacement?: PhotoStickerPlacement; photoStickers?: PhotoStickerInstance[] }, access: ClanCosmeticAccess) {
  return { photoFrame: access.frames && PHOTO_FRAMES.some(f => f.id === details.photoFrame) ? details.photoFrame : "classic", photoSticker: access.stickers && PHOTO_STICKERS.some(s => s.id === details.photoSticker) ? details.photoSticker : "none", photoStickerPlacement: access.stickers ? readPhotoStickerPlacement(details.photoStickerPlacement) : undefined, photoStickers: access.stickers ? readPhotoStickers(details.photoStickers) : [] };
}
