import { Crown, Equal, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import type { BalanceRoster, TeamRoster } from "@/lib/balance/roster-schema";
import type { MaSnapshot } from "@/lib/balance/ma-snapshot";
import { cn } from "@/lib/utils";
import type { ScoreMode } from "@/lib/balance/score-display";
import type { PlayerSessionInfoMap } from "@/lib/balance/player-session-stats";
import { BalancePlayerCardContent, BalancePlayerDetails } from "./balance-player-details";
import { BalanceTeamSummary } from "./balance-team-summary";
import type { PlayerCardInfoMode, TeamComparisonMode } from "@/lib/balance/formation";

export const BALANCE_SLOTS = [
  { key: "d0", label: "딜러 1", role: "dmg", index: 0 },
  { key: "d1", label: "딜러 2", role: "dmg", index: 1 },
  { key: "tank", label: "탱커", role: "tank", index: 0 },
  { key: "s0", label: "힐러 1", role: "sup", index: 0 },
  { key: "s1", label: "힐러 2", role: "sup", index: 1 },
] as const;

export type BalanceSlot = (typeof BALANCE_SLOTS)[number];

export function balanceSlotMember(team: TeamRoster, slot: BalanceSlot) {
  return slot.role === "tank" ? team.tank : team[slot.role][slot.index];
}

export function BalanceRoleIcon({ slot }: { slot: BalanceSlot }) {
  return (
    <span
      className="flex items-center justify-center text-muted-foreground"
      title={slot.label}
      role="img"
      aria-label={slot.label}
    >
      <OverwatchRoleIcon role={slot.role === "dmg" ? "damage" : slot.role === "sup" ? "support" : "tank"} className="size-5 sm:size-6" />
    </span>
  );
}

type TeamHeadingOutcome = "pending" | "team1" | "team2" | "draw" | "void";

export function balanceTeamHeadingResult(outcome?: TeamHeadingOutcome) {
  return {
    team1Won: outcome === "team1",
    team2Won: outcome === "team2",
    centerLabel: outcome === "draw" ? "무승부" : outcome === "void" ? "무효" : "VS",
  } as const;
}

export function BalanceTeamHeading({ roster, scores, mode = "m", premium = false, showPrediction = false, samplePrediction = false, showSummary = true, comparisonMode = "score", outcome, onTeamSelect, selectionDisabled }: { roster?: BalanceRoster; scores?: MaSnapshot; mode?: ScoreMode; premium?: boolean; showPrediction?: boolean; samplePrediction?: boolean; showSummary?: boolean; comparisonMode?: TeamComparisonMode; outcome?: TeamHeadingOutcome; onTeamSelect?: (team: "team1" | "team2") => void; selectionDisabled?: boolean }) {
  if (roster && scores && !onTeamSelect && (!outcome || outcome === "pending")) return <BalanceTeamSummary roster={roster} scores={scores} mode={mode} premium={premium} showPrediction={showPrediction} samplePrediction={samplePrediction} enabled={showSummary} comparisonMode={comparisonMode} />;
  const result = balanceTeamHeadingResult(outcome);
  const Label = onTeamSelect ? "button" : "span";
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 text-center sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]">
      <Label type={onTeamSelect ? "button" : undefined} disabled={onTeamSelect ? selectionDisabled : undefined} onClick={onTeamSelect ? () => onTeamSelect("team1") : undefined} aria-pressed={onTeamSelect ? result.team1Won : undefined} className="inline-flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-bold tracking-wider text-sky-600 focus-visible:outline-2 focus-visible:outline-ring dark:text-sky-300" aria-label={onTeamSelect ? "블루 승" : result.team1Won ? "1팀 승리" : undefined}>
        {result.team1Won ? <Crown className="size-4 text-amber-400" aria-hidden="true" /> : null}
        1팀
      </Label>
      <span className="text-base font-black italic text-muted-foreground/60">
        {result.centerLabel === "무승부" ? <span className="flex flex-col items-center text-[10px] not-italic tracking-normal text-amber-300"><Equal className="size-5" aria-hidden="true" />무승부</span> : result.centerLabel === "무효" ? <span className="flex flex-col items-center text-[10px] not-italic"><RotateCcw className="size-4" aria-hidden="true" />무효</span> : result.centerLabel}
      </span>
      <Label type={onTeamSelect ? "button" : undefined} disabled={onTeamSelect ? selectionDisabled : undefined} onClick={onTeamSelect ? () => onTeamSelect("team2") : undefined} aria-pressed={onTeamSelect ? result.team2Won : undefined} className="inline-flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-bold tracking-wider text-rose-600 focus-visible:outline-2 focus-visible:outline-ring dark:text-rose-300" aria-label={onTeamSelect ? "레드 승" : result.team2Won ? "2팀 승리" : undefined}>
        2팀
        {result.team2Won ? <Crown className="size-4 text-amber-400" aria-hidden="true" /> : null}
      </Label>
    </div>
  );
}

export function ClanBalanceRosterBoard({
  roster,
  pool,
  snapshot,
  planPremium = false,
  scoreMode = "m",
  highlightPlayer,
  playerSessionInfo,
  samplePlayerIds = [],
  samplePrediction = false,
  showPrediction = false,
  showPlayerCardScore = true,
  showPlayerCardInfo = true,
  showTeamComparisonSummary = true,
  teamComparisonMode = "score",
  showPlayerSessionSummary = true,
  playerCardInfo = "record",
  outcome,
  onTeamSelect,
  selectionDisabled,
  renderScore,
}: {
  roster: BalanceRoster;
  pool: readonly { user_id: string; nickname: string }[];
  snapshot?: MaSnapshot;
  planPremium?: boolean;
  scoreMode?: "m" | "a";
  highlightPlayer?: string;
  playerSessionInfo?: PlayerSessionInfoMap;
  samplePlayerIds?: readonly string[];
  samplePrediction?: boolean;
  showPrediction?: boolean;
  showPlayerCardScore?: boolean;
  showPlayerCardInfo?: boolean;
  showTeamComparisonSummary?: boolean;
  teamComparisonMode?: TeamComparisonMode;
  showPlayerSessionSummary?: boolean;
  playerCardInfo?: PlayerCardInfoMode;
  outcome?: TeamHeadingOutcome;
  onTeamSelect?: (team: "team1" | "team2") => void;
  selectionDisabled?: boolean;
  renderScore?: (userId: string) => ReactNode;
}) {
  const nickById = Object.fromEntries(pool.map((p) => [p.user_id, p.nickname]));
  const mode = scoreMode === "a" && planPremium ? "a" : "m";
  return (
    <div aria-label="출전 라인업">
      <BalanceTeamHeading roster={roster} scores={snapshot} mode={mode} premium={planPremium} showPrediction={showPrediction} samplePrediction={samplePrediction} showSummary={showTeamComparisonSummary} comparisonMode={teamComparisonMode} outcome={outcome} onTeamSelect={onTeamSelect} selectionDisabled={selectionDisabled} />
      <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] gap-2 rounded-xl bg-muted/35 p-2 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] sm:p-3">
        {(["team1", "team2"] as const).map((team, idx) => <div key={team} className="contents">
          {idx === 1 ? <div className="grid grid-rows-5 gap-2">{BALANCE_SLOTS.map((slot) => <BalanceRoleIcon key={slot.key} slot={slot} />)}</div> : null}
          <div data-testid={`balance-team-${team}`} className={cn("relative min-w-0 rounded-xl p-1", (outcome === team || outcome === "draw") && "ring-2 ring-amber-400/70", outcome === "void" && "opacity-50 grayscale", onTeamSelect && "hover:bg-amber-400/5 hover:ring-2 hover:ring-amber-400/70 [&:has([data-score-editor=editing])]:ring-0! [&:has([data-score-editor=editing])]:bg-transparent! [&:has([data-score-editor]:hover)]:ring-0! [&:has([data-score-editor]:hover)]:bg-transparent!")}>
            {onTeamSelect ? <button type="button" aria-label={`${idx + 1}팀 승리 선택`} aria-pressed={outcome === team} disabled={selectionDisabled} onClick={() => onTeamSelect(team)} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait" /> : null}
            <div className={cn("space-y-2", onTeamSelect && "pointer-events-none")}>
            {BALANCE_SLOTS.map((slot) => {
              const userId = balanceSlotMember(roster[team], slot);
              const nickname = userId
                ? (nickById[userId] ?? "탈퇴한 멤버")
                : "빈자리";
              const score = userId && snapshot ? snapshot[userId] : undefined;
              const info = userId ? playerSessionInfo?.[userId] : undefined;
              return (
                <div key={slot.key}>
                  <BalancePlayerDetails nickname={nickname} info={info} score={score} premium={planPremium} sample={Boolean(userId && samplePlayerIds.includes(userId))} enabled={showPlayerSessionSummary}>
                  <div
                    key={userId ?? "empty"}
                    tabIndex={showPlayerSessionSummary && userId && (info || score) ? 0 : undefined}
                    title={!onTeamSelect && !info && !score ? nickname : undefined}
                    data-board-slot={`${team}:${slot.key}`}
                    className={cn(
                      "flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center focus-visible:outline-2 focus-visible:outline-ring sm:px-4",
                      team === "team1"
                        ? "border-sky-500/35 bg-sky-500/[0.06]"
                        : "border-rose-500/35 bg-rose-500/[0.06]",
                      !userId && "border-dashed opacity-65",
                      userId === highlightPlayer &&
                        "ring-2 ring-primary motion-safe:animate-in motion-safe:slide-in-from-bottom-3 motion-safe:fade-in motion-safe:duration-500",
                    )}
                  >
                    <span className="sr-only">
                      {team === "team1" ? "1팀" : "2팀"} {slot.label}
                    </span>
                    <BalancePlayerCardContent nickname={nickname} info={info} score={score} showScore={Boolean(showPlayerCardScore && snapshot && userId)} showInfo={showPlayerCardInfo} infoMode={playerCardInfo} mode={mode} mirrored={team === "team2"} scoreControl={userId ? renderScore?.(userId) : undefined} />
                    {!userId ? (
                      <span className="text-[10px] text-muted-foreground">
                        참가자 대기
                      </span>
                    ) : null}
                  </div>
                  </BalancePlayerDetails>
                </div>
              );
            })}
            </div>
          </div>
        </div>)}
      </div>
    </div>
  );
}
