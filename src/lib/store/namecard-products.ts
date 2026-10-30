import { NAMECARD_THEMES, namecardThemeSelections, type NamecardCategory, type NamecardState } from "../profile/namecard";
import { NORMAL_SYMBOLS } from "../profile/symbols";
import { namecardBackground } from "../profile/backgrounds";
import { namecardFrame } from "../profile/frames";

export const STORE_CATEGORIES = [
  { id: "theme", label: "테마" },
  { id: "emblem", label: "심벌" }, { id: "portrait", label: "초상 프레임" },
  { id: "namebar", label: "배경" }, { id: "frame", label: "카드 프레임" }, { id: "sub", label: "칭호" },
] as const;
export type StoreCategory = typeof STORE_CATEGORIES[number]["id"];
export type NamecardProduct = {
  id: string; category: StoreCategory; name: string; description: string;
  price: number; addedAt: number; available: boolean;
  rarity?: "normal";
  selections: NamecardState["selections"];
};
export function namecardProducts(state: NamecardState): NamecardProduct[] {
  const available = (id: string) => state.owned.includes(id) || state.catalog.some(o => o.id === id && o.unlock_source === "default");
  const products: NamecardProduct[] = NAMECARD_THEMES.flatMap(theme => {
    const selections = namecardThemeSelections(state.catalog, theme.id);
    return selections.length === 3 && selections.every(s => available(s.option_id)) ? [{
      id: theme.id, category: "theme" as const, name: theme.name, description: theme.description + " · 배경과 두 프레임 세트",
      price: 0, addedAt: Math.max(0, ...selections.map(selection => Date.parse(state.catalog.find(option => option.id === selection.option_id)?.created_at ?? "") || 0)), available: true, selections,
    }] : [];
  });
  const chosen = new Map<string, (typeof state.catalog)[number]>();
  for (const option of state.catalog) {
    if (!(option.code.endsWith("-default") || /^(symbol-|background-normal-|portrait-normal-|frame-normal-|starter-|theme-)/.test(option.code) || (option.category === "sub" && option.unlock_source === "store"))) continue;
    const key = option.category + ":" + option.name_ko;
    const previous = chosen.get(key);
    const rank = (item: typeof option) => (state.selections.some(s => s.option_id === item.id) ? 8 : 0) + (available(item.id) ? 4 : 0);
    if (!previous || rank(option) > rank(previous)) chosen.set(key, option);
  }
  for (const option of chosen.values()) {
    const category = option.category as NamecardCategory;
    const label = STORE_CATEGORIES.find(c => c.id === category)?.label ?? "디자인";
    const symbol = NORMAL_SYMBOLS.find(item => option.code === `symbol-normal-${item.id}`);
    const background = namecardBackground(option.code);
    const frame = category === "portrait" || category === "frame" ? namecardFrame(option.code, category) : null;
    products.push({ id: option.id, category, name: option.code.endsWith("-default") ? ({ emblem: "기본 방패", portrait: "기본 초상 프레임", namebar: "기본 배경", frame: "기본 카드 프레임", sub: "칭호 없음" })[category] : option.name_ko,
      description: frame ? `노말 · ${frame.description} · 기본 제공` : background ? "노말 · 두 색 패턴 배경 · 기본 제공" : symbol ? "노말 · 단색 도형 심벌 · 기본 제공" : category === "sub" ? "게임 ID 아래에 표시하는 공통 칭호" : `${label}만 바꿔 다른 디자인과 자유롭게 조합하십시오.`,
      price: option.price_coins, rarity: symbol || background || frame ? "normal" : undefined,
      addedAt: Date.parse(option.created_at ?? "") || 0, available: available(option.id),
      selections: [{ category, option_id: option.id }],
    });
  }
  return products.sort((a, b) => b.addedAt - a.addedAt || a.id.localeCompare(b.id));
}

export function withProduct(selections: NamecardState["selections"], product: NamecardProduct): NamecardState["selections"] {
  return [...selections.filter(s => !product.selections.some(next => next.category === s.category)), ...product.selections];
}
