export type PhotoStickerPlacement = {
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  scale?: number;
};

export const DEFAULT_STICKER_PLACEMENT: PhotoStickerPlacement = { x: 80, y: 22, rotation: 12, flipX: false, flipY: false, scale: 1 };

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
