import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { StatTitle } from "./stat-help";

export function ClanOperationalStats({ stats }: { stats: ClanStatsPageModel["intra"] }) {
  return (
      <Card className="gap-0 py-0" role="region" aria-label="내전 운영 통계">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h3 aria-label="내전 운영 통계" className="text-sm font-semibold"><StatTitle title="내전 운영 통계" help="보존된 경매 로그의 낙찰·구매 이력을 집계합니다. 입찰 중인 금액과 기록이 없는 경매는 포함하지 않습니다." /></h3>
          <span className="rounded-md bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">낙찰 <strong className="ml-1 font-medium tabular-nums text-foreground">{stats.auction.lots.toLocaleString()}건</strong></span>
        </CardHeader>
        <CardContent className="grid gap-6 px-5 py-5 md:grid-cols-2">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold"><StatTitle title="역할별 낙찰가" help="낙찰된 선수의 역할별 평균 가격입니다. 입찰만 된 금액은 제외합니다." /></h4>
            <table className="w-full text-xs" aria-label="역할별 평균 낙찰가">
              <thead className="text-muted-foreground"><tr className="border-b"><th className="pb-2 text-left font-normal">역할</th><th className="pb-2 text-right font-normal">낙찰</th><th className="pb-2 text-right font-normal">평균 가격</th></tr></thead>
              <tbody className="divide-y">{stats.auction.priceByRole.map((row) => <tr key={row.role}>
                <td className="py-3">{({ tank: "돌격", dmg: "공격", sup: "지원", unknown: "역할 미상" } as Record<string, string>)[row.role] ?? row.role}</td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">{row.lots.toLocaleString()}건</td>
                <td className="py-3 text-right font-medium tabular-nums">{row.average.toLocaleString()}pt</td>
              </tr>)}</tbody>
            </table>
            {!stats.auction.lots && <p className="py-3 text-center text-xs text-muted-foreground">낙찰 기록 없음</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["100pt 미만", "100~199pt", "200~399pt", "400pt 이상"].map((label, index) => (
                <div key={label} className="rounded-lg bg-muted/40 px-2 py-3 text-center text-xs">
                  <span className="block text-[10px] text-muted-foreground">{label}</span>
                  <strong className="mt-1 block font-medium tabular-nums">{stats.auction.priceRanges[index].toLocaleString()}건</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5 border-t pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold"><StatTitle title="팀별 경매 지출" help={`팀별 누적 낙찰액입니다. 잔액은 완료된 경매 ${stats.auction.budgetSnapshots}회의 잔액 합계이며, 각 경기의 개별 예산과 구분합니다.`} /></h4>
              <div className="grid grid-cols-2 divide-x">{(["team1", "team2"] as const).map((team, index) => <div key={team} className={index ? "pl-5" : "pr-5"}>
                <p className="text-xs text-muted-foreground">{index + 1}팀 낙찰액</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.auction.teamSpend[team].toLocaleString()}<span className="ml-1 text-xs font-normal text-muted-foreground">pt</span></p>
                {stats.auction.budgetSnapshots > 0 && <p className="mt-2 text-xs text-muted-foreground">잔액 <span className="tabular-nums">{stats.auction.teamRemaining[team].toLocaleString()}pt</span></p>}
              </div>)}</div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold"><StatTitle title="전략 아이템" help="경매에서 구매한 아이템별 누적 구매 횟수와 사용한 포인트입니다." /></h4>
              <ul className="mt-2 divide-y">{stats.auction.items.map((item) => <li key={item.name} className="flex items-center justify-between gap-3 py-3 text-xs">
                <span>{item.name}</span><span className="shrink-0 tabular-nums"><span className="mr-3 text-muted-foreground">{item.purchases.toLocaleString()}회</span><strong className="font-medium">{item.totalCost.toLocaleString()}pt</strong></span>
              </li>)}</ul>
              {!stats.auction.items.length && <p className="py-3 text-xs text-muted-foreground">구매 기록 없음</p>}
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
