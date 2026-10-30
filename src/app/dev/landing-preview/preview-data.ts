import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import type { ClanDashboardModel } from "@/lib/clan/load-clan-dashboard";

// Local fictional examples only; no QA records are loaded or changed.
export const pool = ["여울", "노을", "루나", "하루", "소다", "모카", "구름", "별빛", "라임", "우주", "단비", "나무"].map((nickname, index) => ({
  user_id: `landing-example-${index + 1}`, nickname,
}));
export const roster: BalanceRoster = {
  team1: { tank: pool[0].user_id, dmg: [pool[1].user_id, pool[2].user_id], sup: [pool[3].user_id, pool[4].user_id] },
  team2: { tank: pool[5].user_id, dmg: [pool[6].user_id, pool[7].user_id], sup: [pool[8].user_id, pool[9].user_id] },
};
export const scores = Object.fromEntries(pool.map(({ user_id }, index) => [user_id, { m: [3, 2, 1, 2, 1, 2, 3, 1, 1, 2, 1, 2][index], a: null }]));
export const records: ClanArchiveMatch[] = ["부산", "왕의 길", "리장 타워"].map((mapLabel, index) => ({
  id: `landing-match-${index}`, seriesId: "landing-series", sessionNumber: 12, operatorName: "여울",
  sessionOpenedAt: "2026-10-30T11:00:00+09:00", matchType: "intra", mapLabel,
  playedAt: `2026-10-30T${12 + index}:00:00+09:00`, occurredAt: `2026-10-30T${12 + index}:00:00+09:00`,
  source: "balance", outcome: index === 1 ? "team2" : "team1", winnerTeam: index === 1 ? 2 : 1,
  players: pool.slice(0, 10).map(({ user_id, nickname }, player) => ({
    userId: user_id, nickname, team: player < 5 ? 1 : 2,
    role: player % 5 === 0 ? "tank" : player % 5 < 3 ? "dmg" : "sup", m: scores[user_id].m, a: null,
  })),
}));

export const dashboard: ClanDashboardModel = {
  now: "2026-10-30T10:00:00+09:00", createdAt: "2026-07-01T00:00:00+09:00",
  completedIntraCount: 24, previousMonth: "2026년 9월",
  rules: "서로 존중하며, 승패보다 함께하는 시간을 즐겨요.",
  notices: [
    { id: "landing-notice", title: "새로 온 멤버들을 환영합니다", content: "", createdAt: "2026-10-29T12:00:00+09:00", kind: "notice", isPinned: true },
    { id: "landing-poll", title: "다음 모임, 언제가 좋을까요?", content: "", createdAt: "2026-10-28T12:00:00+09:00", kind: "poll", isPinned: false },
  ],
  events: [
    { id: "landing-intra", title: "금요일 정기 내전", kind: "intra", start_at: "2026-10-30T21:00:00+09:00", place: "Discord", source: "manual", repeat: "none", repeat_weekdays: null, repeat_time: null },
    { id: "landing-event", title: "주말 자유 게임 모임", kind: "event", start_at: "2026-11-01T20:00:00+09:00", place: "Discord", source: "manual", repeat: "none", repeat_weekdays: null, repeat_time: null },
  ],
  communityLinks: { discord: "", kakao: "", line: "", telegram: "", whatsapp: "", steam: "" },
  discordConnected: false,
  mvp: {
    winRate: ["여울", "루나", "모카"].map((nickname, i) => ({ rank: i + 1, userId: `landing-win-${i}`, nickname, percentage: [75, 66.7, 62.5][i], tiedCount: 1 })),
    participation: ["하루", "노을", "구름"].map((nickname, i) => ({ rank: i + 1, userId: `landing-attend-${i}`, nickname, percentage: [100, 87.5, 75][i], tiedCount: 1 })),
    prediction: [],
  },
  errors: { notices: false, rules: false, events: false, rankings: false },
};
export const trend = [24, 32, 28, 36].map((value, i) => ({ key: `2026-${String(i + 7).padStart(2, "0")}`, label: `${i + 7}월`, value }));

