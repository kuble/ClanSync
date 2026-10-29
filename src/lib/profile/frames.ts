export const NORMAL_PORTRAIT_FRAMES = [
  { id: "ring", name: "링", description: "심벌을 감싸는 얇은 원형 테두리" },
  { id: "orbit", name: "듀얼", description: "간격을 둔 두 겹의 원형 테두리" },
  { id: "bracket", name: "브래킷", description: "네 모서리만 남긴 열린 사각 프레임" },
  { id: "diamond", name: "다이아", description: "모서리를 잘라낸 마름모 윤곽" },
  { id: "capsule", name: "캡슐", description: "양옆 포인트를 더한 둥근 사각 프레임" },
] as const;

export const NORMAL_CARD_FRAMES = [
  { id: "line", name: "라인", description: "외곽을 정돈하는 한 줄 테두리" },
  { id: "double", name: "더블", description: "안쪽 여백을 둔 두 겹 테두리" },
  { id: "corner", name: "코너", description: "네 모서리를 강조한 열린 테두리" },
  { id: "rail", name: "레일", description: "위아래 두 줄과 좌우의 짧은 포인트" },
  { id: "tab", name: "탭", description: "대각 모서리에 탭을 더한 비대칭 테두리" },
] as const;

export function namecardFrame(code?: string | null, category: "portrait" | "frame" = "frame") {
  const designs = category === "portrait" ? NORMAL_PORTRAIT_FRAMES : NORMAL_CARD_FRAMES;
  return designs.find(item => code === `${category}-normal-${item.id}`) ?? null;
}
