export const MAP_TYPES = [
  { id: "control", label: "쟁탈" },
  { id: "push", label: "밀기" },
  { id: "escort", label: "화물" },
  { id: "hybrid", label: "혼합" },
] as const;

export type MapType = (typeof MAP_TYPES)[number]["id"];

/**
 * 내전에서 지원하는 4개 유형의 전장 목록. 시즌별 경쟁전 로테이션은 아니다.
 * 한글 명칭·유형: Blizzard 패치 노트 2023/02, 2023/10, 2024/06 및
 * 네온 교차로 소개 https://overwatch.blizzard.com/ko-kr/news/24271881/
 */
const OVERWATCH_MAPS: readonly { label: string; type: MapType }[] = [
  { label: "리장 타워", type: "control" },
  { label: "오아시스", type: "control" },
  { label: "일리오스", type: "control" },
  { label: "네팔", type: "control" },
  { label: "부산", type: "control" },
  { label: "남극 반도", type: "control" },
  { label: "사모아", type: "control" },
  { label: "뉴 퀸 스트리트", type: "push" },
  { label: "콜로세오", type: "push" },
  { label: "이스페란사", type: "push" },
  { label: "루나사피", type: "push" },
  { label: "도라도", type: "escort" },
  { label: "66번 국도", type: "escort" },
  { label: "감시 기지: 지브롤터", type: "escort" },
  { label: "쓰레기촌", type: "escort" },
  { label: "리알토", type: "escort" },
  { label: "하바나", type: "escort" },
  { label: "서킷 로얄", type: "escort" },
  { label: "샴발리 수도원", type: "escort" },
  { label: "왕의 길", type: "hybrid" },
  { label: "눔바니", type: "hybrid" },
  { label: "할리우드", type: "hybrid" },
  { label: "아이헨발데", type: "hybrid" },
  { label: "블리자드 월드", type: "hybrid" },
  { label: "미드타운", type: "hybrid" },
  { label: "파라이수", type: "hybrid" },
  { label: "네온 교차로", type: "hybrid" },
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

export function mapPoolForGameSlug(
  slug: string,
  types: readonly MapType[] = [],
): readonly string[] {
  if (slug === "overwatch") {
    return OVERWATCH_MAPS.filter(
      (map) => types.length === 0 || types.includes(map.type),
    ).map((map) => map.label);
  }
  if (slug === "valorant") return VALORANT_MAPS;
  return FALLBACK_MAPS;
}

export function pickThreeMapCandidates(
  slug: string,
  types: readonly MapType[] = [],
): string[] {
  const pool = [...mapPoolForGameSlug(slug, types)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 3);
}
