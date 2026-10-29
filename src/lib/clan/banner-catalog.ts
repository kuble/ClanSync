import { COSMETIC_COLOR_PRESETS, type CosmeticColorPresetId } from "@/lib/cosmetics/color-presets";

export const BANNER_RARITIES = {
  normal: { label: "노말", description: "정말 간단한 디자인 패턴" },
  rare: { label: "레어", description: "간단한 도형으로 만들어진 디자인" },
  unique: { label: "유니크", description: "일러스트레이터 원화" },
  legend: { label: "레전드", description: "애니메이팅 되어있는 배너" },
} as const;

export const NORMAL_CLAN_BANNERS = ([
  { id: "graphite-hairline", name: "핀스트라이프", pattern: "가느다란 세로줄" },
  { id: "navy-horizontal", name: "가로 스트라이프", pattern: "얇은 가로줄" },
  { id: "forest-diagonal", name: "사선", pattern: "반복 사선" },
  { id: "burgundy-dots", name: "미니 도트", pattern: "작은 점" },
  { id: "indigo-grid", name: "그리드", pattern: "얇은 격자" },
  { id: "copper-crosshatch", name: "크로스해치", pattern: "성긴 교차선" },
  { id: "teal-ripple", name: "리플", pattern: "완만한 물결선" },
  { id: "plum-herringbone", name: "헤링본", pattern: "작은 헤링본" },
  { id: "slate-dash", name: "대시", pattern: "짧은 점선" },
  { id: "olive-weave", name: "바스켓 위브", pattern: "잔잔한 직조선" },
] as const).map(design => ({ ...design, rarity: "normal" as const, maskUrl: `/clan-banners/normal-v1/masks/${design.id}.svg` }));

export type ClanBannerDesignId = typeof NORMAL_CLAN_BANNERS[number]["id"];
export type ClanBannerSelection = { designId: ClanBannerDesignId; paletteId: CosmeticColorPresetId };
export const DEFAULT_CLAN_BANNER_SELECTION: ClanBannerSelection = { designId: "graphite-hairline", paletteId: "graphite" };

export function readClanBannerSelection(value: unknown): ClanBannerSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { designId, paletteId } = value as Record<string, unknown>;
  const design = NORMAL_CLAN_BANNERS.find(item => item.id === designId);
  const palette = COSMETIC_COLOR_PRESETS.find(item => item.id === paletteId);
  return design && palette ? { designId: design.id, paletteId: palette.id } : null;
}
