export type NamecardCategory = "emblem" | "namebar" | "sub" | "frame" | "portrait";
export type NamecardOption = { id: string; category: NamecardCategory; code: string; name_ko: string; unlock_source: string; price_coins: number; created_at?: string };
export type NamecardAppearance = { title: string | null; frame: string | null; namebar: string | null; emblem: string | null; portrait: string | null };
export type ClanNamecards = Record<string, NamecardAppearance & { displayName: string }>;
export type NamecardState = { catalog: NamecardOption[]; owned: string[]; selections: { category: NamecardCategory; option_id: string }[]; coinBalance: number };
export type NamecardResult = { ok: true; state: NamecardState } | { ok: false; error: string };

export function namecardAppearance(catalog: NamecardOption[], selections: NamecardState["selections"]): NamecardAppearance {
  const selected = (category: NamecardCategory) => catalog.find((option) => option.id === selections.find((item) => item.category === category)?.option_id);
  const title = selected("sub");
  return { title: title && !title.code.endsWith("-sub-default") ? title.name_ko : null, frame: selected("frame")?.code ?? null, namebar: selected("namebar")?.code ?? null, emblem: selected("emblem")?.code ?? null, portrait: selected("portrait")?.code ?? null };
}

export const NAMECARD_THEMES = [
  { id: "arcade", name: "심야 아케이드", description: "픽셀 도시와 네온 장식", artwork: "/namecards/v1/arcade.webp" },
  { id: "tactical", name: "전술 기록", description: "지형도와 금속 장식", artwork: "/namecards/v1/tactical.webp" },
  { id: "nebula", name: "성운 항해", description: "성운과 금빛 원형 장식", artwork: "/namecards/v1/nebula.webp" },
] as const;

export function namecardThemeSelections(catalog: NamecardOption[], themeId: string): NamecardState["selections"] {
  if (!NAMECARD_THEMES.some(theme => theme.id === themeId)) return [];
  return (["frame", "namebar", "portrait"] as const).flatMap(category => {
    const option = catalog.find(item => item.category === category && item.code === `theme-${themeId}-${category}`);
    return option ? [{ category, option_id: option.id }] : [];
  });
}
