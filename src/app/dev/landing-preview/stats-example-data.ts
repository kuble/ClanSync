import type { ClanArchiveMatch, ClanStatsPageModel, HofPeriodPayload } from "@/lib/clan/stats/load-clan-stats";
import { buildIntraStats, type PersonalMatch } from "@/lib/clan/stats/clan-stats-analytics";
import { HOF_CONFIG_DEFAULTS } from "@/lib/clan/stats/hof-config";
import { EMPTY_INTRA_OVERVIEW } from "@/lib/clan/stats/intra-overview";

// Fictional snapshots only. No deferred loaders or real clan identifiers.

export function statsExampleModel(records: ClanArchiveMatch[]): ClanStatsPageModel {
  const people = ["여울", "루나", "모카"].map((nickname, index) => ({ userId: `example-${index}`, nickname }));
  const maps = ["부산", "왕의 길", "리장 타워"];
  const matches: PersonalMatch[] = Array.from({ length: 12 }, (_, i) => ({
    id: `example-match-${i}`, source: "balance", seriesId: `example-series-${Math.floor(i / 3)}`,
    date: "2026-10-30", occurredAt: new Date(Date.parse("2026-10-30T21:00:00+09:00") - i * 600000).toISOString(),
    map: maps[i % 3], role: (["tank", "dmg", "sup"] as const)[i % 3], evaluation: 2, analysis: null,
    result: i % 4 === 3 ? "loss" : "win",
    peers: [
      { id: "peer-1", nickname: "하루", role: "sup", relation: "ally" },
      { id: "peer-2", nickname: "노을", role: "dmg", relation: i % 3 ? "ally" : "enemy" },
      { id: "peer-3", nickname: "구름", role: "tank", relation: "enemy" },
    ],
  }));
  const block: HofPeriodPayload = {
    totals: { sessions: 24, days: 24, matches: 120 }, minimumGames: 30, minimumSessions: 8,
    unqualified: [], unqualifiedParticipation: [], undisclosed: false, undisclosedHint: null,
    winRate: people.map((p, i) => ({ ...p, wins: 36 - i * 3, draws: 0, losses: 12 + i * 3, ratePct: (36 - i * 3) / 48 * 100 })),
    wins: [], streaks: [], participation: people.map((p, i) => ({ ...p, played: 24 - i * 3, ratePct: (24 - i * 3) / 24 * 100 })),
    cumulative: people.map((p, i) => ({ ...p, played: 108 - i * 12 })),
    predictionCorrect: people.map((p, i) => ({ ...p, correct: 18 - i * 2, valid: 24, ratePct: (18 - i * 2) / 24 * 100 })),
  };
  const overview = {
    ...EMPTY_INTRA_OVERVIEW, sessions: 24, completed: 120, participants: 18,
    maps: maps.map((name, i) => ({ name, value: [48, 42, 30][i] })),
    bans: [
      { name: "캐서디", id: "cassidy", role: "dps", value: 32 },
      { name: "D.Va", id: "dva", role: "tank", value: 28 },
      { name: "아나", id: "ana", role: "support", value: 20 },
    ],
    mapVotes: maps.map((name, i) => ({ name, value: [96, 80, 64][i] })),
  };
  return {
    clanId: "landing-example", deferredDetails: false, deferredPeriods: false,
    intra: buildIntraStats([], []), intraPeriods: { all: overview, "2026": overview, "2026-10": overview },
    personal: { viewerId: people[0].userId, canSeePeers: true, people: [{ ...people[0], matches, predictions: [], predictionPoints: [], visibleSections: ["records", "emblems"] }] },
    summary: { totalMatches: 120, intraCount: 120, scrimCount: 0, eventCount: 0, memberCount: 18, clanCreatedAt: "2026-07-01" },
    hof: { exposeHof: true, config: { ...HOF_CONFIG_DEFAULTS, predictionVisibleTop: 3 }, periods: { all: block, month: block, year: block }, historyMonths: { "2026-10": block }, historyYears: { "2026": block } },
    rankmap: { personDaysByYearMonth: {}, intraMatchesByYearMonth: {}, intraParticipantsByYearMonth: {}, years: ["2026"] },
    archive: { datesKst: ["2026-10-30"], sampleByDate: { "2026-10-30": records } },
    permissions: { viewPersonalRecords: true, setHofRules: false, isLeader: false, isStaff: false, viewMatchRecords: true, correctMatchRecords: false, viewMscore: false, editMscore: false, exportCsv: false },
  };
}
