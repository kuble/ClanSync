/** The round stores a snapshot so later catalog edits do not change an auction. */
export type AuctionItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

export type ClanAuctionItem = AuctionItem & { enabled: boolean };

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
    return "아이템 이름은 1~80자로 입력해 주세요.";
  }
  if (typeof item.description !== "string" || item.description.trim().length > 500) {
    return "아이템 설명은 500자 이내로 입력해 주세요.";
  }
  if (!Number.isInteger(item.cost) || item.cost < 0 || item.cost > 100000 || item.cost % 10 !== 0) {
    return "가격은 0~100,000pt 사이에서 10pt 단위로 입력해 주세요.";
  }
  if (typeof item.enabled !== "boolean") return "아이템 사용 여부를 확인해 주세요.";
  return null;
}
