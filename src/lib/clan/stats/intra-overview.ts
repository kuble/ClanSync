import { completedIntra } from "./clan-stats-analytics";
import type { ClanMatchRecord } from "./normalize-clan-match-records";
import { isoToKstYmd } from "./kst";
import { OW_HEROES } from "@/lib/balance/ow-hero-ban";

export type StatsPeriod = { mode: "all" | "year" | "month"; year: string; month: string; day: string };
export const statsPeriodKey = (period: StatsPeriod) => period.mode === "all" ? "all" : period.mode === "year" ? period.year : `${period.year}-${period.month}${period.day === "all" ? "" : `-${period.day}`}`;
export const statsPeriodLabel = (period: StatsPeriod) => period.mode === "all" ? "전체 기간" : period.mode === "year" ? `${period.year}년` : `${period.year}년 ${Number(period.month)}월${period.day === "all" ? "" : ` ${Number(period.day)}일`}`;
export type IntraOverview = {
  sessions: number; completed: number; participants: number; draws: number;
  averageMatchesPerSession: number | null; averageParticipantsPerSession: number | null;
  maps: { name: string; value: number }[];
  bans: { name: string; id: string; role: string | null; value: number }[];
  mapVotes: { name: string; value: number }[];
  banEnabledMatches: number; noBanMatches: number;
};
export const EMPTY_INTRA_OVERVIEW: IntraOverview = { sessions: 0, completed: 0, participants: 0, draws: 0, averageMatchesPerSession: null, averageParticipantsPerSession: null, maps: [], bans: [], mapVotes: [], banEnabledMatches: 0, noBanMatches: 0 };

/** Build four count-only buckets per record. Identities and raw rosters never leave the server. */
export function buildIntraOverviewPeriods(records: readonly ClanMatchRecord[], sessions: readonly { id: string; openedAt: string }[]): Record<string, IntraOverview> {
  type Bucket = { opened: Set<string>; people: Set<string>; seriesPeople: Map<string, Set<string>>; records: ClanMatchRecord[] };
  const buckets = new Map<string, Bucket>();
  const ensure = (key: string) => {
    if (!buckets.has(key)) buckets.set(key, { opened: new Set(), people: new Set(), seriesPeople: new Map(), records: [] });
    return buckets.get(key)!;
  };
  const keys = (date: string) => ["all", date.slice(0, 4), date.slice(0, 7), date];
  ensure("all");
  for (const session of sessions) for (const key of keys(isoToKstYmd(session.openedAt))) ensure(key).opened.add(session.id);
  for (const record of completedIntra(records)) for (const key of keys(isoToKstYmd(record.played_at))) {
    const bucket = ensure(key);
    bucket.records.push(record);
    for (const player of record.match_players) {
      bucket.people.add(player.user_id);
      if (record.series_id && bucket.opened.has(record.series_id)) {
        if (!bucket.seriesPeople.has(record.series_id)) bucket.seriesPeople.set(record.series_id, new Set());
        bucket.seriesPeople.get(record.series_id)!.add(player.user_id);
      }
    }
  }
  return Object.fromEntries([...buckets].map(([key, bucket]) => {
    const maps = new Map<string, number>(), bans = new Map<string, number>(), mapVotes = new Map<string, number>();
    const add = (target: Map<string, number>, name: string) => target.set(name, (target.get(name) ?? 0) + 1);
    let connected = 0, draws = 0, enabled = 0, noBan = 0;
    for (const record of bucket.records) {
      if (record.series_id && bucket.opened.has(record.series_id)) connected++;
      if (record.outcome === "draw") draws++;
      add(maps, record.map_label ?? "맵 미기록");
      if (record.hero_ban_enabled === true) { enabled++; if (!record.banned_heroes?.length) noBan++; }
      for (const hero of new Set(record.banned_heroes ?? [])) add(bans, hero);
      for (const vote of record.map_votes ?? []) {
        const candidate = record.map_candidates?.[vote];
        if (candidate) add(mapVotes, candidate);
      }
    }
    const ranked = (data: Map<string, number>) => [...data].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([name, value]) => ({ name, value }));
    return [key, {
      sessions: bucket.opened.size, completed: bucket.records.length, participants: bucket.people.size, draws,
      averageMatchesPerSession: bucket.opened.size ? Math.round(connected / bucket.opened.size * 10) / 10 : null,
      averageParticipantsPerSession: bucket.opened.size ? Math.round([...bucket.seriesPeople.values()].reduce((sum, people) => sum + people.size, 0) / bucket.opened.size * 10) / 10 : null,
      maps: ranked(maps), mapVotes: ranked(mapVotes),
      bans: ranked(bans).map(({ name: id, value }) => { const hero = OW_HEROES.find((row) => row.id === id); return { id, name: hero?.nameKo ?? id, role: hero?.role ?? null, value }; }),
      banEnabledMatches: enabled, noBanMatches: noBan,
    } satisfies IntraOverview];
  }));
}

export function intraTrendPoints(periods: Record<string, IntraOverview>, period: StatsPeriod, metric: "sessions" | "completed" | "participants") {
  const keys = period.mode === "all" ? Object.keys(periods).filter((key) => /^\d{4}$/.test(key)).sort()
    : period.mode === "year" ? Array.from({ length: 12 }, (_, i) => `${period.year}-${String(i + 1).padStart(2, "0")}`)
    : period.day !== "all" ? [statsPeriodKey(period)]
    : Array.from({ length: new Date(Date.UTC(Number(period.year), Number(period.month), 0)).getUTCDate() }, (_, i) => `${period.year}-${period.month}-${String(i + 1).padStart(2, "0")}`);
  return keys.map((key) => ({ key, label: key.length === 4 ? `${key}년` : key.length === 7 ? `${Number(key.slice(5))}월` : `${Number(key.slice(8))}일`, value: periods[key]?.[metric] ?? 0 }));
}
