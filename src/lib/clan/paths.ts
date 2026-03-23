/** MainClan 라우트 베이스 (`/games/.../clan/[clanId]` 제외 하위 세그먼트). */
export function clanBasePath(
  locale: string,
  gameSlug: string,
  clanId: string,
): string {
  return `/${locale}/games/${gameSlug}/clan/${clanId}`;
}
