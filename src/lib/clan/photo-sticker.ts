export type PhotoStickerPlacement = {
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  scale?: number;
};

export const DEFAULT_STICKER_PLACEMENT: PhotoStickerPlacement = { x: 80, y: 22, rotation: 12, flipX: false, flipY: false, scale: 1 };
export const MAX_PHOTO_STICKERS = 20;
export const PHOTO_STICKER_IDS = ["sparkle", "heart", "gg"] as const;
export type PhotoStickerInstance = { id: string; sticker: (typeof PHOTO_STICKER_IDS)[number]; placement: PhotoStickerPlacement };

export function readPhotoStickers(value: unknown): PhotoStickerInstance[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_PHOTO_STICKERS) return;
  const result: PhotoStickerInstance[] = [], ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some(key => !["id", "sticker", "placement"].includes(key)) ||
        typeof item.id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(item.id) || ids.has(item.id) || !PHOTO_STICKER_IDS.includes(item.sticker)) return;
    const placement = readPhotoStickerPlacement(item.placement);
    if (!placement) return;
    ids.add(item.id); result.push({ id: item.id, sticker: item.sticker, placement });
  }
  return result;
}

export function editablePhotoStickers(details: { photoStickers?: PhotoStickerInstance[]; photoSticker?: string; photoStickerPlacement?: PhotoStickerPlacement }): PhotoStickerInstance[] {
  if (details.photoStickers) return details.photoStickers;
  if (!PHOTO_STICKER_IDS.includes(details.photoSticker as PhotoStickerInstance["sticker"])) return [];
  return [{ id: "00000000-0000-0000-0000-000000000001", sticker: details.photoSticker as PhotoStickerInstance["sticker"], placement: details.photoStickerPlacement ?? { ...DEFAULT_STICKER_PLACEMENT } }];
}

export function readPhotoStickerPlacement(value: unknown): PhotoStickerPlacement | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some(key => !["x", "y", "rotation", "flipX", "flipY", "scale"].includes(key)) ||
      ![p.x, p.y].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100) ||
      typeof p.rotation !== "number" || !Number.isFinite(p.rotation) || Math.abs(p.rotation) > 180 ||
      typeof p.flipX !== "boolean" || typeof p.flipY !== "boolean" ||
      (p.scale !== undefined && (typeof p.scale !== "number" || !Number.isFinite(p.scale) || p.scale < 0.5 || p.scale > 3))) return;
  return { x: p.x as number, y: p.y as number, rotation: p.rotation, flipX: p.flipX, flipY: p.flipY, ...(typeof p.scale === "number" ? { scale: p.scale } : {}) };
}

export function stickerPlacementStyle(p: PhotoStickerPlacement) {
  return { left: `${p.x}%`, top: `${p.y}%`, width: `${Number((18 * (p.scale ?? 1)).toFixed(3))}%`, transform: `translate(-50%, -50%) rotate(${p.rotation}deg)` };
}

export function stickerMirrorStyle(p: PhotoStickerPlacement) { return { transform: `scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})` }; }
