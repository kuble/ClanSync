/** MainGame `/games/[gameSlug]` 탭 값 — 서버·클라이언트 공통. */

export type MainGameCommunityTab = "home" | "promo" | "lfg" | "rank" | "scrim";

const MAIN_GAME_TAB_SET = new Set<MainGameCommunityTab>([
  "home",
  "promo",
  "lfg",
  "rank",
  "scrim",
]);

export function coerceMainGameCommunityTab(raw: unknown): MainGameCommunityTab {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (MAIN_GAME_TAB_SET.has(s as MainGameCommunityTab)) return s as MainGameCommunityTab;
  return "home";
}
