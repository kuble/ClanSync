export const MANAGE_SECTIONS = [
  { key: "overview", group: "클랜 운영", label: "운영 현황", description: "클랜 정보와 처리할 일을 확인하십시오." },
  { key: "promotion", group: "클랜 운영", label: "클랜 홍보", description: "홍보글을 작성하고 가입 조건을 설정하십시오." },
  { key: "notices", group: "클랜 운영", label: "공지·규칙", description: "클랜 소식과 함께 지킬 규칙을 관리하십시오." },
  { key: "appearance", group: "클랜 운영", label: "클랜 꾸미기", description: "클랜 프로필 이미지와 보유 배너를 변경하십시오." },
  { key: "insights", group: "클랜 운영", label: "운영 통계", description: "편성 균형, 맵 투표·경매와 사이트 이용을 확인하십시오." },
  { key: "members", group: "구성원 관리", label: "구성원", description: "멤버의 활동과 운영 역할을 관리하십시오." },
  { key: "requests", group: "구성원 관리", label: "가입 요청", description: "대기 중인 신청을 확인하고 승인하거나 거절하십시오." },
  { key: "notifications", group: "운영 설정", label: "알림·연동", description: "클랜 채팅방 링크와 Discord 자동 알림을 관리하십시오." },
  { key: "balance", group: "운영 설정", label: "내전", description: "내전 세션의 자동 종료 여부와 시간을 설정하십시오." },
  { key: "subscription", group: "운영 설정", label: "코인·플랜", description: "클랜 코인, 이용 플랜과 구매 정정을 관리하십시오." },
] as const;

export type ManageTab = (typeof MANAGE_SECTIONS)[number]["key"];

export function resolveManageTab(value: string | string[] | undefined): ManageTab {
  return MANAGE_SECTIONS.find((section) => section.key === value)?.key ?? "overview";
}
