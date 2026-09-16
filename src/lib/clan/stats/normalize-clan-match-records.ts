import type { Database, Json } from "@/lib/supabase/database.types";
import { parseRoster } from "@/lib/balance/roster-schema";
import { parseMaSnapshot } from "@/lib/balance/ma-snapshot";

type MatchTable = Database["public"]["Tables"]["matches"]["Row"];
type SessionTable = Database["public"]["Tables"]["balance_sessions"]["Row"];

export type StoredClanMatch = Pick<
  MatchTable,
  "id" | "played_at" | "match_type" | "status" | "map_label"
> & {
  match_players: { user_id: string; team: number }[] | null;
  match_results:
    { winner_team: number | null } | { winner_team: number | null }[] | null;
};

export type CompletedBalanceSession = Pick<
  SessionTable,
  | "id"
  | "opened_at"
  | "closed_at"
  | "predictions_settled_at"
  | "resolved_map_label"
  | "roster"
  | "ma_snapshot"
  | "match_outcome"
> & {
  balance_session_series?: { opened_at: string } | null;
};

export type ClanMatchPlayer = {
  user_id: string;
  team: number;
  role: "tank" | "dmg" | "sup" | null;
  m: number | null;
  a: number | null;
};

export type ClanMatchRecord = {
  id: string;
  source: "match" | "balance";
  played_at: string;
  match_type: MatchTable["match_type"];
  status: "finished";
  map_label: string | null;
  match_players: ClanMatchPlayer[];
  match_results: { winner_team: number | null } | null;
  outcome: "team1" | "team2" | "draw" | "void" | "unrecorded";
};

function sessionPlayers(rosterJson: Json, scoreJson: Json): ClanMatchPlayer[] {
  const roster = parseRoster(rosterJson);
  const scores = parseMaSnapshot(scoreJson);
  const players: ClanMatchPlayer[] = [];
  for (const [index, team] of [roster.team1, roster.team2].entries()) {
    const slots = [
      { userId: team.tank, role: "tank" as const },
      ...team.dmg.map((userId) => ({ userId, role: "dmg" as const })),
      ...team.sup.map((userId) => ({ userId, role: "sup" as const })),
    ];
    for (const slot of slots) {
      if (!slot.userId) continue;
      players.push({
        user_id: slot.userId,
        team: index + 1,
        role: slot.role,
        m: scores[slot.userId]?.m ?? null,
        a: scores[slot.userId]?.a ?? null,
      });
    }
  }
  return players;
}

/** Read-only projection: a settled round is a record before its parent session closes.
 * All rounds use the parent session opening date, including rounds after midnight.
 * A closed round with a pending outcome is a legacy cancellation, not a played match.
 * The current schema does not copy rounds into matches; a matching id always prefers
 * the explicit match record, so later record corrections retain one canonical source.
 */
export function normalizeClanMatchRecords(
  matches: readonly StoredClanMatch[],
  sessions: readonly CompletedBalanceSession[],
): ClanMatchRecord[] {
  const records = new Map<string, ClanMatchRecord>();
  const explicitIds = new Set(matches.map((match) => match.id));
  for (const match of matches) {
    if (match.status !== "finished") continue;
    const result = Array.isArray(match.match_results)
      ? (match.match_results[0] ?? null)
      : match.match_results;
    records.set(match.id, {
      id: match.id,
      source: "match",
      played_at: match.played_at,
      match_type: match.match_type,
      status: "finished",
      map_label: match.map_label,
      match_players: (match.match_players ?? []).map((player) => ({
        ...player,
        role: null,
        m: null,
        a: null,
      })),
      match_results: result,
      outcome:
        result === null
          ? "unrecorded"
          : result.winner_team === 1
            ? "team1"
            : result.winner_team === 2
              ? "team2"
              : "draw",
    });
  }
  for (const session of sessions) {
    if (session.match_outcome === "pending" || explicitIds.has(session.id))
      continue;
    const winner =
      session.match_outcome === "team1"
        ? 1
        : session.match_outcome === "team2"
          ? 2
          : null;
    records.set(session.id, {
      id: session.id,
      source: "balance",
      played_at:
        session.balance_session_series?.opened_at ??
        session.predictions_settled_at ??
        session.closed_at ??
        session.opened_at,
      match_type: "intra",
      status: "finished",
      map_label: session.resolved_map_label,
      match_players: sessionPlayers(session.roster, session.ma_snapshot),
      match_results: { winner_team: winner },
      outcome: session.match_outcome,
    });
  }
  return [...records.values()].sort(
    (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
  );
}
