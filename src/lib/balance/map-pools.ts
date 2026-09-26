export const MAP_TYPES = [
  { id: "control", label: "쟁탈" },
  { id: "push", label: "밀기" },
  { id: "escort", label: "화물" },
  { id: "hybrid", label: "혼합" },
  { id: "flashpoint", label: "플래시포인트" },
] as const;

export type MapType = (typeof MAP_TYPES)[number]["id"];

/**
 * 내전에서 지원하는 5개 유형의 전장 목록. 시즌별 경쟁전 로테이션은 아니다.
 * 한글 명칭·유형: Blizzard 패치 노트 2023/02, 2023/10, 2024/06 및
 * 플래시포인트: https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2025/6/
 * 네온 교차로 소개 https://overwatch.blizzard.com/ko-kr/news/24271881/
 */
const OVERWATCH_MAPS: readonly { id: string; label: string; type: MapType }[] = [
  { id: "lijiang-tower", label: "리장 타워", type: "control" },
  { id: "oasis", label: "오아시스", type: "control" },
  { id: "ilios", label: "일리오스", type: "control" },
  { id: "nepal", label: "네팔", type: "control" },
  { id: "busan", label: "부산", type: "control" },
  { id: "antarctic-peninsula", label: "남극 반도", type: "control" },
  { id: "samoa", label: "사모아", type: "control" },
  { id: "new-queen-street", label: "뉴 퀸 스트리트", type: "push" },
  { id: "colosseo", label: "콜로세오", type: "push" },
  { id: "esperanca", label: "이스페란사", type: "push" },
  { id: "runasapi", label: "루나사피", type: "push" },
  { id: "dorado", label: "도라도", type: "escort" },
  { id: "route-66", label: "66번 국도", type: "escort" },
  { id: "watchpoint-gibraltar", label: "감시 기지: 지브롤터", type: "escort" },
  { id: "junkertown", label: "쓰레기촌", type: "escort" },
  { id: "rialto", label: "리알토", type: "escort" },
  { id: "havana", label: "하바나", type: "escort" },
  { id: "circuit-royal", label: "서킷 로얄", type: "escort" },
  { id: "shambali-monastery", label: "샴발리 수도원", type: "escort" },
  { id: "kings-row", label: "왕의 길", type: "hybrid" },
  { id: "numbani", label: "눔바니", type: "hybrid" },
  { id: "hollywood", label: "할리우드", type: "hybrid" },
  { id: "eichenwalde", label: "아이헨발데", type: "hybrid" },
  { id: "blizzard-world", label: "블리자드 월드", type: "hybrid" },
  { id: "midtown", label: "미드타운", type: "hybrid" },
  { id: "paraiso", label: "파라이수", type: "hybrid" },
  { id: "neon-junction", label: "네온 교차로", type: "hybrid" },
  { id: "suravasa", label: "수라바사", type: "flashpoint" },
  { id: "new-junk-city", label: "뉴 정크 시티", type: "flashpoint" },
  { id: "aatlis", label: "아틀리스", type: "flashpoint" },
];

/** Artwork sources: public/images/overwatch/maps/SOURCES.json. */
export function mapDetailsForLabel(label: string) {
  const map = OVERWATCH_MAPS.find((entry) => entry.label === label);
  return map ? { ...map, image: `/images/overwatch/maps/${map.id}.webp` } : null;
}

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
