export type SquareCrop = { x: number; y: number; size: number };
export function squareCrop(width: number, height: number, zoom = 1, pan = { x: 0, y: 0 }): SquareCrop {
  const size = Math.max(1, Math.floor(Math.min(width, height) / Math.max(1, Math.min(4, zoom))));
  return { size, x: Math.max(0, Math.min(width - size, Math.round((width - size) / 2 + pan.x))), y: Math.max(0, Math.min(height - size, Math.round((height - size) / 2 + pan.y))) };
}
export function validSquareCrop(value: unknown, width: number, height: number): value is SquareCrop {
  if (!value || typeof value !== "object") return false;
  const crop = value as SquareCrop;
  return [crop.x, crop.y, crop.size].every(Number.isSafeInteger) && crop.x >= 0 && crop.y >= 0 && crop.size > 0 && crop.x + crop.size <= width && crop.y + crop.size <= height;
}
