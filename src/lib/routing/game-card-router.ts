/**
 * D-AUTH-01 — 목업 `routeFromGameCard` 와 동일 규칙. `?game=` 쿼리는 [gameSlug] 경로로 치환.
 */
export type ClanStatus = "none" | "pending" | "member";

export type GameCardState = {
  slug: string;
  auth: boolean;
  clanStatus: ClanStatus;
  clanId: string | null;
  clanName: string | null;
  disabled?: boolean;
};

export function routeFromGameCard(
  base: string,
  card: GameCardState,
): { path: string; query: Record<string, string> } {
  if (card.disabled) {
    return { path: "", query: {} };
  }

  const g = card.slug;
  const query: Record<string, string> = {};

  if (!card.auth) {
    if (card.clanStatus === "member") query.reauth = "1";
    return { path: `${base}/games/${encodeURIComponent(g)}/auth`, query };
  }

  if (card.clanStatus === "member" && card.clanId) {
    return {
      path: `${base}/games/${encodeURIComponent(g)}/clan/${encodeURIComponent(card.clanId)}`,
      query: {},
    };
  }

  if (card.clanStatus === "pending") query.pending = "1";
  return { path: `${base}/games/${encodeURIComponent(g)}/clan`, query };
}

export function buildGameCardHref(base: string, card: GameCardState): string {
  const { path, query } = routeFromGameCard(base, card);
  if (!path) return "#";
  const q = new URLSearchParams(query);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}
