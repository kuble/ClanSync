import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { StatTitle } from "./stat-help";
import { StatsScrollArea } from "./stats-scroll-area";

export function ClanOperationalStats({ stats }: { stats: ClanStatsPageModel["intra"] }) {
  const midpoint = Math.ceil(stats.mapVotes.length / 2);
  const mapGroups = [stats.mapVotes.slice(0, midpoint), stats.mapVotes.slice(midpoint)];

  return (
    <section className="space-y-4" aria-label="내전 운영 통계">
      <h3 className="text-sm font-bold">내전 운영 통계</h3>
      <Card size="sm">
        <CardHeader>
          <CardTitle>
            <StatTitle title="맵 투표와 선정" help="후보 등장·투표 수·최종 선정은 서로 다른 단위입니다." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.mapVotes.length ? (
            <div className="grid gap-3 min-[900px]:grid-cols-2">
              {mapGroups.filter((rows) => rows.length).map((rows, index) => (
                <StatsScrollArea key={index} label={`맵 투표와 선정 목록 ${index + 1}`} className="max-h-80">
                  <table className="w-full min-w-[340px] text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="p-2 text-left">맵</th>
                        <th className="p-2 text-right">후보</th>
                        <th className="p-2 text-right">득표</th>
                        <th className="p-2 text-right">선정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.name} className="border-b">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 text-right">{row.candidates}회</td>
                          <td className="p-2 text-right">{row.votes}표</td>
                          <td className="p-2 text-right">{row.selected}경기</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StatsScrollArea>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">맵 투표 이력이 없습니다.</p>}
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader><CardTitle>경매 기록 · {stats.auction.lots}건 낙찰</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold"><StatTitle title="역할별 낙찰가" help="낙찰된 선수의 역할별 평균 가격입니다. 입찰만 된 금액은 제외합니다." /></h4>
            {stats.auction.priceByRole.map((row) => (
              <div key={row.role} className="flex justify-between rounded-lg border p-2 text-sm">
                <span>{({ tank: "돌격", dmg: "공격", sup: "지원", unknown: "역할 미상" } as Record<string, string>)[row.role] ?? row.role} · {row.lots}건</span>
                <strong>평균 {row.average}pt</strong>
              </div>
            ))}
            {!stats.auction.lots && <p className="text-xs text-muted-foreground">보존된 낙찰 이력이 없습니다.</p>}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {["100pt 미만", "100~199pt", "200~399pt", "400pt 이상"].map((label, index) => (
                <div key={label} className="rounded-lg bg-muted/30 p-2 text-center text-xs">
                  <span className="block text-muted-foreground">{label}</span>
                  <strong>{stats.auction.priceRanges[index]}건</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold"><StatTitle title="예산과 전략 아이템" help="보존된 낙찰·구매 로그만 집계합니다. 다른 경기의 예산은 섞어 비교하지 않습니다." /></h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-2">1팀 누적 낙찰액 <strong className="block">{stats.auction.teamSpend.team1}pt</strong></div>
              <div className="rounded-lg border p-2">2팀 누적 낙찰액 <strong className="block">{stats.auction.teamSpend.team2}pt</strong></div>
            </div>
            {stats.auction.budgetSnapshots > 0 && <p className="text-xs text-muted-foreground">완료 경매 {stats.auction.budgetSnapshots}회 잔액 합계: 1팀 {stats.auction.teamRemaining.team1}pt · 2팀 {stats.auction.teamRemaining.team2}pt</p>}
            {stats.auction.items.map((item) => (
              <div key={item.name} className="flex justify-between rounded-lg border p-2 text-sm">
                <span>{item.name}</span><strong>{item.purchases}회 · {item.totalCost}pt</strong>
              </div>
            ))}
            {!stats.auction.items.length && <p className="text-xs text-muted-foreground">구매한 전략 아이템이 없습니다.</p>}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
