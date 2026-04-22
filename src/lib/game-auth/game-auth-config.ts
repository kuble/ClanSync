/**
 * D-AUTH-02 — 게임별 OAuth 제공자 메타(제목·CTA·활성 여부).
 * 실제 OAuth URL 연결은 이후 환경 변수·Route Handler로 확장.
 */
export type GameAuthProviderConfig = {
  slug: string;
  providerLabel: string;
  title: string;
  ctaLabel: string;
  hint: string;
  /** Battle.net / Riot 등 실연동 버튼 활성 (현재는 개발 시뮬레이터만 연결) */
  oauthReady: boolean;
};

const CONFIG: Record<string, GameAuthProviderConfig> = {
  overwatch: {
    slug: "overwatch",
    providerLabel: "Battle.net",
    title: "오버워치 계정 연동",
    ctaLabel: "Battle.net으로 계속하기",
    hint: "Battle.net 계정으로 본인을 확인합니다.",
    oauthReady: true,
  },
  valorant: {
    slug: "valorant",
    providerLabel: "Riot",
    title: "발로란트 계정 연동",
    ctaLabel: "Riot 계정으로 계속하기",
    hint: "Riot 계정으로 본인을 확인합니다.",
    oauthReady: true,
  },
  lol: {
    slug: "lol",
    providerLabel: "Riot",
    title: "리그 오브 레전드 계정 연동",
    ctaLabel: "(출시 예정)",
    hint: "곧 추가 예정입니다.",
    oauthReady: false,
  },
  pubg: {
    slug: "pubg",
    providerLabel: "Krafton",
    title: "PUBG 계정 연동",
    ctaLabel: "(출시 예정)",
    hint: "곧 추가 예정입니다.",
    oauthReady: false,
  },
};

export function getGameAuthConfig(gameSlug: string): GameAuthProviderConfig | null {
  return CONFIG[gameSlug] ?? null;
}
