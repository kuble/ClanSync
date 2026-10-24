// Visible artwork bounds, measured from alpha. Layout uses the physical bottom,
// not the transparent square of the original atlas. Coordinates are source pixels.
export const SHOWCASE_ART = [
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [54, 73, 329, 307] },
  { path: "/images/showcase/fox-v2.webp", size: [640, 640], bounds: [86, 46, 529, 552] },
  { path: "/images/showcase/keyboard-v2.webp", size: [1000, 333], bounds: [9, 70, 982, 214] },
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [30, 420, 362, 368] },
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [440, 545, 379, 231] },
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [900, 506, 330, 268] },
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [136, 812, 205, 430] },
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [533, 841, 188, 323] },
  { path: "/images/showcase/collectibles-v1.webp", size: [1254, 1254], bounds: [847, 936, 385, 166] },
] as const;

export function showcaseArtRatio(sprite: number, imagePath?: string | null) {
  const art = SHOWCASE_ART[sprite];
  return !imagePath && art ? art.bounds[2] / art.bounds[3] : 1;
}

export function showcaseDisplayWidth(product: { width: number; sprite: number; image_path?: string | null }) {
  // Keep ornaments compact after removing atlas padding; include the keyboard mat.
  const scale = product.image_path ? 1 : ({ 0: .85, 2: 1.35, 6: .6, 7: .35 } as Record<number, number>)[product.sprite] ?? 1;
  return product.width * scale;
}
