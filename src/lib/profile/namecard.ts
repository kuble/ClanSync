export type NamecardCategory = "emblem" | "namebar" | "sub" | "frame";
export type NamecardOption = { id: string; category: NamecardCategory; code: string; name_ko: string; unlock_source: string; price_coins: number };
export type NamecardAppearance = { title: string | null; frame: string | null; namebar: string | null; emblem: string | null };
export type ClanNamecards = Record<string, NamecardAppearance & { displayName: string }>;
export type NamecardState = { catalog: NamecardOption[]; owned: string[]; selections: { category: NamecardCategory; option_id: string }[]; coinBalance: number };
export type NamecardResult = { ok: true; state: NamecardState } | { ok: false; error: string };

export function namecardAppearance(catalog: NamecardOption[], selections: NamecardState["selections"]): NamecardAppearance {
  const selected = (category: NamecardCategory) => catalog.find((option) => option.id === selections.find((item) => item.category === category)?.option_id);
  const title = selected("sub");
  return { title: title && title.unlock_source !== "default" ? title.name_ko : null, frame: selected("frame")?.code ?? null, namebar: selected("namebar")?.code ?? null, emblem: selected("emblem")?.code ?? null };
}
