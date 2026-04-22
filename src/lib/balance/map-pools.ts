/** MVP 맵 풀(표시용 한글 라벨). 게임 메타와 1:1 아님. */
const OVERWATCH_MAPS: readonly string[] = [
  "리장 타워",
  "오아시스",
  "일리오스",
  "네팔",
  "뉴 정크시티",
  "파라이소",
  "서킷 로얄",
  "수라바사",
  "블리자드 월드",
  "로메오",
  "할로윈",
  "아틀란티스",
  "에덴 가든",
  "뉴 스위스",
];

const VALORANT_MAPS: readonly string[] = [
  "어센트",
  "바인",
  "브리즈",
  "프랙처",
  "헤이븐",
  "로터스",
  "선셋",
  "어비스",
  "펄",
  "스플릿",
  "아이스박스",
  "코레아",
];

const FALLBACK_MAPS: readonly string[] = [
  "맵 A",
  "맵 B",
  "맵 C",
  "맵 D",
  "맵 E",
];

export function mapPoolForGameSlug(slug: string): readonly string[] {
  if (slug === "overwatch") return OVERWATCH_MAPS;
  if (slug === "valorant") return VALORANT_MAPS;
  return FALLBACK_MAPS;
}

export function pickThreeMapCandidates(slug: string): string[] {
  const pool = [...mapPoolForGameSlug(slug)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 3);
}
