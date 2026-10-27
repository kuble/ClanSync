import { NAMECARD_THEMES, namecardThemeSelections, type NamecardCategory, type NamecardState } from "../profile/namecard";

export const STORE_CATEGORIES = [
  { id: "all", label: "전체" }, { id: "theme", label: "테마" },
  { id: "emblem", label: "심벌" }, { id: "portrait", label: "초상 프레임" },
  { id: "namebar", label: "배경" }, { id: "frame", label: "카드 프레임" }, { id: "sub", label: "칭호" },
] as const;
export type StoreCategory = typeof STORE_CATEGORIES[number]["id"];
export type NamecardProduct = {
  id: string; category: Exclude<StoreCategory, "all">; name: string; description: string;
  price: number; available: boolean; premium: boolean; legacy: boolean;
  selections: NamecardState["selections"];
};
export type PremiumFrameOffer = { price: number; eligible: boolean; gameSlug?: string; clanId?: string };

export function namecardProducts(state: NamecardState, offer: PremiumFrameOffer | null): NamecardProduct[] {
  const available = (id: string) => state.owned.includes(id) || state.catalog.some(o => o.id === id && o.unlock_source === "default");
  const products: NamecardProduct[] = NAMECARD_THEMES.flatMap(theme => {
    const selections = namecardThemeSelections(state.catalog, theme.id);
    return selections.length === 3 && selections.every(s => available(s.option_id)) ? [{
      id: theme.id, category: "theme" as const, name: theme.name, description: theme.description + " · 배경과 두 프레임 세트",
      price: 0, available: true, premium: false, legacy: false, selections,
    }] : [];
  });
  const chosen = new Map<string, (typeof state.catalog)[number]>();
  for (const option of state.catalog) {
    const legacy = option.code.startsWith("pf_entrance_store:");
    if (!(option.code.endsWith("-default") || /^(symbol-|starter-|theme-)/.test(option.code) || (option.category === "sub" && option.unlock_source === "store") || (legacy && offer))) continue;
    const key = option.category + ":" + (legacy ? "premium" : option.name_ko);
    const previous = chosen.get(key);
    const rank = (item: typeof option) => (state.selections.some(s => s.option_id === item.id) ? 8 : 0) + (available(item.id) ? 4 : 0) + (item.code === `pf_entrance_store:${offer?.gameSlug}` ? 2 : 0);
    if (!previous || rank(option) > rank(previous)) chosen.set(key, option);
  }
  for (const option of chosen.values()) {
    const legacy = option.code.startsWith("pf_entrance_store:");
    const category = option.category as NamecardCategory;
    const label = STORE_CATEGORIES.find(c => c.id === category)?.label ?? "디자인";
    products.push({ id: option.id, category, name: legacy ? "프리미엄 골드 프레임" : option.code.endsWith("-default") ? ({ emblem: "기본 방패", portrait: "기본 초상 프레임", namebar: "기본 배경", frame: "기본 카드 프레임", sub: "칭호 없음" })[category] : option.name_ko,
      description: category === "sub" ? "게임 ID 아래에 표시하는 공통 칭호" : `${label}만 바꿔 다른 디자인과 자유롭게 조합하세요.`,
      price: legacy ? offer!.price : option.price_coins,
      available: available(option.id), premium: legacy, legacy,
      selections: [{ category, option_id: option.id }],
    });
  }
  return products;
}

export function withProduct(selections: NamecardState["selections"], product: NamecardProduct): NamecardState["selections"] {
  return [...selections.filter(s => !product.selections.some(next => next.category === s.category)), ...product.selections];
}
