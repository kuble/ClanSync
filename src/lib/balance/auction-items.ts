/** The round stores a snapshot so later catalog edits do not change an auction. */
export type AuctionItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

export type ClanAuctionItem = AuctionItem & { enabled: boolean };

/** Stored per room; shared catalog entries stay authoritative. */
export type RoundAuctionCatalog = { excludedItemIds: string[]; items: ClanAuctionItem[] };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateRoundAuctionCatalog(value: unknown): asserts value is RoundAuctionCatalog | undefined {
  if (value === undefined) return;
  const catalog = value as RoundAuctionCatalog | null;
  if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.items) ||
    !Array.isArray(catalog.excludedItemIds) || catalog.items.length > 30 || catalog.excludedItemIds.length > 100 ||
    catalog.excludedItemIds.some((id) => typeof id !== "string" || !uuid.test(id)) ||
    new Set(catalog.excludedItemIds).size !== catalog.excludedItemIds.length ||
    catalog.items.some((item) => !item || typeof item.id !== "string" || !uuid.test(item.id) || auctionItemValidationError(item)) ||
    new Set(catalog.items.map((item) => item.id)).size !== catalog.items.length ||
    new Set(catalog.items.map((item) => item.name.trim().toLowerCase())).size !== catalog.items.length)
    throw new Error("아이템 목록을 확인하십시오. 내전 전용 아이템은 최대 30개까지 등록할 수 있습니다.");
}

export function normalizeRoundAuctionCatalog(catalog: RoundAuctionCatalog): RoundAuctionCatalog {
  return {
    excludedItemIds: [...catalog.excludedItemIds].sort(),
    items: catalog.items.map(({ id, name, description, cost, enabled }) => ({
      id, name: name.trim(), description: description.trim(), cost, enabled,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function sameRoundAuctionCatalog(a?: RoundAuctionCatalog, b?: RoundAuctionCatalog) {
  const empty = { items: [], excludedItemIds: [] };
  return JSON.stringify(normalizeRoundAuctionCatalog(a ?? empty)) === JSON.stringify(normalizeRoundAuctionCatalog(b ?? empty));
}

export function effectiveAuctionItems(shared: ClanAuctionItem[], catalog?: RoundAuctionCatalog): AuctionItem[] {
  const excluded = new Set(catalog?.excludedItemIds);
  const sharedIds = new Set(shared.map((item) => item.id));
  if (catalog?.items.some((item) => sharedIds.has(item.id))) throw new Error("기본 아이템의 내용은 내전 전용 아이템으로 덮어쓸 수 없습니다.");
  return [...shared.filter((item) => item.enabled && !excluded.has(item.id)), ...(catalog?.items.filter((item) => item.enabled) ?? [])]
    .map(({ id, name, description, cost }) => ({ id, name, description, cost }));
}

export const AUCTION_ITEM_EXAMPLES: Omit<ClanAuctionItem, "id">[] = [
  {
    name: "맵 선정권",
    description: "이번 경기의 맵을 선택합니다. 적용 방법은 경기 시작 전에 양 팀이 확인합니다.",
    cost: 100,
    enabled: true,
  },
  {
    name: "영웅 밴 무효화권",
    description: "영웅 밴 1개를 무효화합니다. 대상 영웅을 알리고 운영진이 적용합니다.",
    cost: 100,
    enabled: true,
  },
  {
    name: "돌격 영웅 체력 10% 증가권",
    description: "구매 팀의 돌격 영웅 체력을 10% 높입니다. 게임 내 사용자 지정 설정에서 직접 적용합니다.",
    cost: 200,
    enabled: true,
  },
];

export function auctionItemValidationError(item: Omit<ClanAuctionItem, "id">) {
  if (typeof item.name !== "string" || !item.name.trim() || item.name.trim().length > 80) {
    return "아이템 이름은 1~80자로 입력해 주십시오.";
  }
  if (typeof item.description !== "string" || item.description.trim().length > 500) {
    return "아이템 설명은 500자 이내로 입력해 주십시오.";
  }
  if (!Number.isInteger(item.cost) || item.cost < 0 || item.cost > 100000 || item.cost % 10 !== 0) {
    return "가격은 0~100,000pt 사이에서 10pt 단위로 입력해 주십시오.";
  }
  if (typeof item.enabled !== "boolean") return "아이템 사용 여부를 확인해 주십시오.";
  return null;
}
