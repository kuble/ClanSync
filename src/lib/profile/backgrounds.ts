import { COSMETIC_COLOR_PRESETS, type CosmeticColorPresetId } from "../cosmetics/color-presets";

export const NORMAL_NAMECARD_BACKGROUNDS = [
  { id: "rail", name: "레일", paletteId: "graphite" },
  { id: "wave", name: "웨이브", paletteId: "blue" },
  { id: "fold", name: "폴드", paletteId: "green" },
  { id: "step", name: "스텝", paletteId: "amber" },
  { id: "tile", name: "타일", paletteId: "purple" },
] as const;

export function namecardBackground(code?: string | null, paletteId?: string | null) {
  const background = NORMAL_NAMECARD_BACKGROUNDS.find(item => code === `background-normal-${item.id}`);
  if (!background) return null;
  const palette = COSMETIC_COLOR_PRESETS.find(item => item.id === paletteId) ?? COSMETIC_COLOR_PRESETS.find(item => item.id === background.paletteId)!;
  return { ...background, paletteId: palette.id, palette, mask: `/namecard-backgrounds/normal-v1/masks/${background.id}.svg` };
}

export function isNamecardPalette(value: unknown): value is CosmeticColorPresetId {
  return COSMETIC_COLOR_PRESETS.some(palette => palette.id === value);
}
