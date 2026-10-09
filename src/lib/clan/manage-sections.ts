export const MANAGE_SECTIONS = [
  { key: "overview", group: "클랜 운영", label: "운영 현황", description: "클랜 정보와 처리할 일을 확인하세요." },
  { key: "notices", group: "클랜 운영", label: "공지·규칙", description: "클랜 소식과 함께 지킬 규칙을 관리하세요." },
  { key: "appearance", group: "클랜 운영", label: "클랜 꾸미기", description: "클랜을 대표하는 배너를 관리하세요." },
  { key: "requests", group: "구성원 관리", label: "가입 요청", description: "대기 중인 신청을 확인하고 승인하거나 거절하세요." },
  { key: "members", group: "구성원 관리", label: "구성원", description: "멤버의 활동과 운영 역할을 관리하세요." },
  { key: "balance", group: "운영 설정", label: "내전·경매", description: "내전 자동 종료와 경매 전략 아이템을 설정하세요." },
  { key: "insights", group: "운영 설정", label: "운영 통계", description: "편성 균형, 맵 투표·경매와 사이트 이용을 확인하세요." },
  { key: "subscription", group: "운영 설정", label: "코인·플랜", description: "클랜 코인, 이용 플랜과 구매 정정을 관리하세요." },
] as const;

export type ManageTab = (typeof MANAGE_SECTIONS)[number]["key"];

export function resolveManageTab(value: string | string[] | undefined): ManageTab {
  return MANAGE_SECTIONS.find((section) => section.key === value)?.key ?? "overview";
}
