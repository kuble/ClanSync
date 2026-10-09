import type { ClanArchiveMatch } from "./load-clan-stats";

/** Includes every recorded round of the selected session, regardless of UI filters. */
export function archiveSessionSummary(records: readonly ClanArchiveMatch[], selected?: ClanArchiveMatch) {
  const match = selected ?? records[0];
  const rounds = match ? records.filter((row) => match.seriesId ? row.seriesId === match.seriesId : !row.seriesId) : [];
  const participants = new Set(rounds.flatMap((row) => row.players.map((player) => player.userId))).size;
  const starts = rounds.map((row) => Date.parse(row.playedAt)).filter(Number.isFinite);
  const ends = rounds.map((row) => Date.parse(row.occurredAt)).filter(Number.isFinite);
  const opened = match?.sessionOpenedAt ? Date.parse(match.sessionOpenedAt) : starts.length ? Math.min(...starts) : NaN;
  const last = ends.length ? Math.max(...ends) : NaN;
  return {
    number: match?.sessionNumber ?? null,
    participants,
    activeMinutes: Number.isFinite(opened) && Number.isFinite(last) ? Math.max(0, Math.floor((last - opened) / 60_000)) : null,
  };
}

export function sessionDurationLabel(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}시간${remainder ? ` ${remainder}분` : ""}` : `${remainder}분`;
}
