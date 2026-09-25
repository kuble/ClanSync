import type { HofRankPoint } from "@/lib/clan/stats/load-clan-stats";

export const RANK_COLORS = ["#4ade80", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa", "#2dd4bf", "#fb923c", "#c084fc", "#f87171", "#94a3b8"];
type Ranking = "rate" | "attendance" | "appearances" | "prediction";

export function HofRankChart({ points, rows, ranking, period }: {
  points: HofRankPoint[];
  rows: { userId: string; nickname: string }[];
  ranking: Ranking;
  period: "all" | "month" | "year";
}) {
  const leaders = rows.slice(0, 10);
  if (!points.length || !leaders.length) return <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">순위 변동을 표시할 기록이 없습니다.</p>;

  const rankAt = (point: HofRankPoint, userId: string) => {
    const rank = point[ranking].indexOf(userId) + 1;
    return rank > 0 && rank <= 12 ? rank : null;
  };
  const maxRank = Math.max(leaders.length, ...points.flatMap((point) => leaders.map((row) => rankAt(point, row.userId) ?? 0)));
  const width = Math.max(600, points.length * 40 + 135);
  const height = Math.max(260, 76 + (maxRank - 1) * 30);
  const x = (index: number) => 48 + index / Math.max(1, points.length - 1) * (width - 225);
  const y = (rank: number) => 48 + (rank - 1) * 30;
  const label = (date: string) => period === "month" ? `${Number(date.slice(5, 7))}/${Number(date.slice(8))}` : date.slice(0, 7).replace("-", ".");

  return <div className="min-w-0">
    <p className="mb-3 text-xs text-muted-foreground">{period === "month" ? "기록이 있는 날짜" : "월별 마감 시점"}의 누적 순위 · 현재 상위 {leaders.length}명</p>
    <div className="max-w-full overflow-x-auto rounded-lg border bg-background/30">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="max-w-none" role="img" aria-label={`선택 기간 ${leaders.length}명의 누적 순위 변동 그래프`}>
        {points.map((point, index) => points.length > 8 && index % 2 === 1 && index !== points.length - 1 ? null
          : <text key={point.date} x={x(index)} y="22" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.65">{label(point.date)}</text>)}
        {Array.from({ length: maxRank }, (_, index) => index + 1).map((rank) => <g key={rank}>
          <line x1="48" x2={width - 177} y1={y(rank)} y2={y(rank)} stroke="currentColor" strokeOpacity="0.12" />
          <text x="32" y={y(rank) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.6">{rank}</text>
        </g>)}
        {leaders.map((row, index) => {
          let started = false;
          const path = points.map((point, pointIndex) => {
            const rank = rankAt(point, row.userId);
            if (rank === null) { started = false; return ""; }
            const command = started ? "L" : "M";
            started = true;
            return `${command}${x(pointIndex)} ${y(rank)}`;
          }).join(" ");
          const finalRank = rankAt(points[points.length - 1], row.userId);
          return <g key={row.userId}>
            <path d={path} fill="none" stroke={RANK_COLORS[index]} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
            {finalRank !== null && <>
              <circle cx={x(points.length - 1)} cy={y(finalRank)} r="4" fill={RANK_COLORS[index]} />
              <text x={x(points.length - 1) + 11} y={y(finalRank) + 4} fontSize="11" fontWeight="600" fill={RANK_COLORS[index]}>{row.nickname} {finalRank}위</text>
            </>}
          </g>;
        })}
      </svg>
    </div>
    <table className="sr-only">
      <caption>선택 기간의 날짜별 누적 순위</caption>
      <thead><tr><th scope="col">멤버</th>{points.map((point) => <th key={point.date} scope="col">{point.date}</th>)}</tr></thead>
      <tbody>{leaders.map((row) => <tr key={row.userId}><th scope="row">{row.nickname}</th>
        {points.map((point) => <td key={point.date}>{rankAt(point, row.userId) ?? "등재 전 또는 12위 밖"}</td>)}
      </tr>)}</tbody>
    </table>
    <p className="mt-2 text-[11px] text-muted-foreground">등재 기준을 충족하기 전이거나 12위 밖인 지점은 선을 표시하지 않습니다.</p>
  </div>;
}
