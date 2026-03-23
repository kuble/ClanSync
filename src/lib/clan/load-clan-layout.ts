import "server-only";

import { cache } from "react";

import type { ClanLayoutContext, ClanMemberRole } from "./types";

/**
 * 목업 전용. Supabase·RLS 연동은 목업 확정 후 `load-clan-layout`에 실데이터 경로를 추가합니다.
 *
 * 운영진 탭 / OfficerGate 테스트: `.env.local`에 `CLANSYNC_MOCK_ROLE=member` 또는 `officer`.
 */
function parseMockRole(): ClanMemberRole {
  const r = process.env.CLANSYNC_MOCK_ROLE;
  if (r === "leader" || r === "officer" || r === "member") {
    return r;
  }
  return "leader";
}

function mockContext(
  locale: string,
  gameSlug: string,
  clanId: string,
): ClanLayoutContext {
  const name =
    clanId === "demo" ? "Phoenix Rising" : `클랜 (${clanId.slice(0, 8)}…)`;
  return {
    locale,
    gameSlug,
    clanId,
    clan: {
      id: clanId,
      name,
      description:
        "목업용 더미 클랜입니다. 실서비스 데이터는 Supabase 연동 후 연결합니다.",
    },
    game: {
      slug: gameSlug,
      displayName:
        gameSlug === "overwatch"
          ? "오버워치"
          : gameSlug.replace(/-/g, " ").toUpperCase(),
    },
    membership: {
      role: parseMockRole(),
      status: "active",
    },
    subscriptionTier:
      process.env.CLANSYNC_MOCK_TIER === "pro" ? "pro" : "free",
    isMock: true,
  };
}

/** 레이아웃·하위 페이지에서 공유 (React cache로 동일 요청 합침). 목업만 반환. */
export const loadClanLayoutContext = cache(
  async (
    locale: string,
    gameSlug: string,
    clanId: string,
  ): Promise<ClanLayoutContext> => mockContext(locale, gameSlug, clanId),
);
