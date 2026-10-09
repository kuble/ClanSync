import type { ClanStatsPageModel } from "./load-clan-stats";

/** Shared by the full reference model and the selected-person read model. */
export function collectHofEmblems(hof: Pick<ClanStatsPageModel["hof"], "historyMonths" | "historyYears">, userId: string, period: "month" | "year") {
  return Object.entries(period === "month" ? hof.historyMonths : hof.historyYears)
    .sort(([a], [b]) => b.localeCompare(a)).flatMap(([date, block]) => {
      if (block.undisclosed) return [];
      return ([ ["승률", block.winRate], ["최다 참여", block.participation], ["최다 출전", block.cumulative], ["최장 연승", block.streaks], ["예측 적중", block.predictionCorrect] ] as const).flatMap(([category, rows]) => {
        const rank = rows.findIndex((row) => row.userId === userId) + 1;
        return rank > 0 && rank <= 3 ? [{ key: `${period}-${date}-${category}`, date, period, category, rank }] : [];
      });
    });
}
export type HofEmblem = ReturnType<typeof collectHofEmblems>[number];
