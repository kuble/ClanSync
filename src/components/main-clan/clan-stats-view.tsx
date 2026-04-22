"use client";

import { useMemo, useState } from "react";
import { saveClanHofConfigFormAction } from "@/app/actions/clan-stats-hof";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import type { ResolvedHofConfig } from "@/lib/clan/stats/hof-config";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";

const TOP_OPTIONS = [3, 5, 10, 20, 999] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

function HofTable({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-foreground text-sm font-medium">{title}</h4>
      {empty ? (
        <p className="text-muted-foreground text-sm">표시할 데이터가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-border">{children}</div>
      )}
    </div>
  );
}

function HofSettingsForm({
  gameSlug,
  clanId,
  cfg,
  exposeHof,
  isLeader,
  onDone,
}: {
  gameSlug: string;
  clanId: string;
  cfg: ResolvedHofConfig;
  exposeHof: boolean;
  isLeader: boolean;
  onDone: () => void;
}) {
  return (
    <form
      className="grid gap-4 pt-2"
      action={async (fd) => {
        await saveClanHofConfigFormAction(gameSlug, clanId, fd);
        onDone();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="win_rate_visible_top">승률 순위 공개(구성원)</Label>
          <select
            id="win_rate_visible_top"
            name="win_rate_visible_top"
            defaultValue={String(cfg.winRateVisibleTop)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            {TOP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === 999 ? "전체" : `상위 ${n}명`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="participation_visible_top">참여율 순위 공개</Label>
          <select
            id="participation_visible_top"
            name="participation_visible_top"
            defaultValue={String(cfg.participationVisibleTop)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            {TOP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === 999 ? "전체" : `상위 ${n}명`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cumulative_visible_top">누적 출전 순위 공개</Label>
          <select
            id="cumulative_visible_top"
            name="cumulative_visible_top"
            defaultValue={String(cfg.cumulativeVisibleTop)}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            {TOP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === 999 ? "전체" : `상위 ${n}명`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="monthly_rank_visibility">월별 순위 공개</Label>
          <select
            id="monthly_rank_visibility"
            name="monthly_rank_visibility"
            defaultValue={cfg.monthlyRankVisibility}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            <option value="always">상시</option>
            <option value="month_start">다음 달 1일 확정</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="yearly_rank_visibility">연도별 순위 공개</Label>
          <select
            id="yearly_rank_visibility"
            name="yearly_rank_visibility"
            defaultValue={cfg.yearlyRankVisibility}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            <option value="always">상시</option>
            <option value="year_start">다음 해 1월 1일 확정</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="eligibility_game_threshold">등재 기준 — 클랜 총 경기 수 기준점</Label>
          <Input
            id="eligibility_game_threshold"
            name="eligibility_game_threshold"
            type="number"
            min={1}
            max={5000}
            defaultValue={cfg.eligibilityGameThreshold}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eligibility_below_pct">기준점 이하일 때 최소 참여 비율(%)</Label>
          <Input
            id="eligibility_below_pct"
            name="eligibility_below_pct"
            type="number"
            min={1}
            max={100}
            defaultValue={cfg.eligibilityBelowPct}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eligibility_above_min_games">기준점 초과 시 최소 출전 수</Label>
          <Input
            id="eligibility_above_min_games"
            name="eligibility_above_min_games"
            type="number"
            min={1}
            max={2000}
            defaultValue={cfg.eligibilityAboveMinGames}
          />
        </div>
      </div>
      {isLeader ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="expose_hof"
            defaultChecked={exposeHof}
            className="size-4 rounded border"
          />
          <span>
            HoF를 클랜 프로필에 외부 공개 (D-ECON-03, 기본 비공개)
          </span>
        </label>
      ) : null}
      <DialogFooter className="gap-2 sm:justify-end">
        <DialogClose
          render={<Button type="button" variant="outline" />}
        >
          취소
        </DialogClose>
        <Button type="submit">저장</Button>
      </DialogFooter>
    </form>
  );
}

function MiniBars({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-28 items-end gap-1">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="bg-primary/70 w-full min-w-0 max-w-8 rounded-t"
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
            title={`${labels[i]}: ${v}`}
          />
          <span className="text-muted-foreground w-full truncate text-center text-[10px]">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ClanStatsView({
  gameSlug,
  clanId,
  model,
}: {
  gameSlug: string;
  clanId: string;
  model: ClanStatsPageModel;
}) {
  const [hofOpen, setHofOpen] = useState(false);
  const { year: cy, month: cm } = currentKstYearMonth();
  const defaultMainTab = "summary";
  const showArchive = model.permissions.viewMatchRecords;

  const rankYears = useMemo(() => {
    if (model.rankmap.years.length > 0) return model.rankmap.years;
    return [String(cy)];
  }, [model.rankmap.years, cy]);

  const [rankYear, setRankYear] = useState(rankYears[0] ?? String(cy));

  const personRow = model.rankmap.personDaysByYearMonth[rankYear] ?? {};
  const intraRow = model.rankmap.intraMatchesByYearMonth[rankYear] ?? {};
  const partRow = model.rankmap.intraParticipantsByYearMonth[rankYear] ?? {};

  const monthLabels = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1)),
    [],
  );
  const personVals = monthLabels.map((m) => personRow[m] ?? 0);
  const intraVals = monthLabels.map((m) => intraRow[m] ?? 0);
  const partVals = monthLabels.map((m) => partRow[m] ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">클랜 통계</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            요약·명예의 전당·앱 이용(D-STATS-03)·경기 기록 열람 권한에 따른 탭입니다.
          </p>
        </div>
        {model.hof.exposeHof ? (
          <Badge variant="secondary">HoF 외부 공개</Badge>
        ) : null}
      </div>

      <Tabs defaultValue={defaultMainTab} className="w-full">
        <TabsList
          variant="line"
          className="mb-4 w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="hof">명예의 전당</TabsTrigger>
          {showArchive ? (
            <TabsTrigger value="archive">경기 기록</TabsTrigger>
          ) : null}
          <TabsTrigger value="rankmap">앱 이용</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">전체 경기 수</CardTitle>
                <CardDescription>종료된 경기 합계</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {model.summary.totalMatches}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  내전 {model.summary.intraCount} · 스크림 {model.summary.scrimCount}
                  {model.summary.eventCount
                    ? ` · 이벤트 ${model.summary.eventCount}`
                    : ""}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">구성원</CardTitle>
                <CardDescription>현재 클랜 소속 인원</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {model.summary.memberCount}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">클랜 설립일</CardTitle>
                <CardDescription>클랜 생성일 (KST 표시)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium tabular-nums">
                  {formatDate(model.summary.clanCreatedAt)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hof" className="space-y-4">
          <Card size="sm">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 border-b pb-4">
              <div>
                <CardTitle className="text-base">명예의 전당</CardTitle>
                <CardDescription>
                  내전 승률·참여율·누적 출전 (등재 규칙은 설정에 따름)
                </CardDescription>
              </div>
              {model.permissions.setHofRules ? (
                <Dialog open={hofOpen} onOpenChange={setHofOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      />
                    }
                  >
                    <Settings2 className="size-4" aria-hidden />
                    설정
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>명예의 전당 설정</DialogTitle>
                    </DialogHeader>
                    <HofSettingsForm
                      gameSlug={gameSlug}
                      clanId={clanId}
                      cfg={model.hof.config}
                      exposeHof={model.hof.exposeHof}
                      isLeader={model.permissions.isLeader}
                      onDone={() => setHofOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              ) : null}
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="all">
                <TabsList variant="line" className="mb-4">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="month">이번 달 ({cm}월)</TabsTrigger>
                  <TabsTrigger value="year">올해 ({cy})</TabsTrigger>
                </TabsList>
                {(["all", "month", "year"] as const).map((key) => {
                  const block = model.hof.periods[key];
                  return (
                    <TabsContent key={key} value={key} className="space-y-6">
                      {block.undisclosed ? (
                        <p className="text-muted-foreground text-sm">
                          {block.undisclosedHint}
                        </p>
                      ) : (
                        <>
                          <HofTable
                            title="승률 순위 (무승부 제외)"
                            empty={block.winRate.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">닉네임</th>
                                  <th className="px-3 py-2 text-right">승</th>
                                  <th className="px-3 py-2 text-right">패</th>
                                  <th className="px-3 py-2 text-right">승률</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.winRate.map((r, i) => (
                                  <tr key={r.userId} className="border-t border-border">
                                    <td className="px-3 py-2">{i + 1}</td>
                                    <td className="px-3 py-2">{r.nickname}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.wins}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.losses}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.ratePct == null ? "—" : `${r.ratePct}%`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HofTable>
                          <HofTable
                            title="참여율 순위 (해당 기간 내전 대비 출전 비율)"
                            empty={block.participation.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">닉네임</th>
                                  <th className="px-3 py-2 text-right">출전</th>
                                  <th className="px-3 py-2 text-right">참여율</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.participation.map((r, i) => (
                                  <tr key={r.userId} className="border-t border-border">
                                    <td className="px-3 py-2">{i + 1}</td>
                                    <td className="px-3 py-2">{r.nickname}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.played}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.ratePct}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HofTable>
                          <HofTable
                            title="누적 출전 (내전 경기 수)"
                            empty={block.cumulative.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">닉네임</th>
                                  <th className="px-3 py-2 text-right">출전 수</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.cumulative.map((r, i) => (
                                  <tr key={r.userId} className="border-t border-border">
                                    <td className="px-3 py-2">{i + 1}</td>
                                    <td className="px-3 py-2">{r.nickname}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.played}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HofTable>
                        </>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {showArchive ? (
          <TabsContent value="archive" className="space-y-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">경기 기록</CardTitle>
                <CardDescription>
                  일자별 요약(M6b에서 캘린더·정정 요청 UI 연결 예정)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {model.archive.datesKst.length === 0 ? (
                  <p className="text-muted-foreground text-sm">기록된 경기가 없습니다.</p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                    {model.archive.datesKst.map((d) => (
                      <li
                        key={d}
                        className="rounded-lg border border-border px-3 py-2"
                      >
                        <p className="font-medium">{d}</p>
                        <ul className="text-muted-foreground mt-1 list-inside list-disc">
                          {(model.archive.sampleByDate[d] ?? []).map((m) => (
                            <li key={m.id}>
                              {m.matchType}
                              {m.mapLabel ? ` · ${m.mapLabel}` : ""}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="rankmap" className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">활동일 (person-day)</CardTitle>
              <CardDescription>
                D-STATS-03 — 멤버별 하루 최초 1회만 집계. 미래 월은 —.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="rank-year">연도</Label>
                <select
                  id="rank-year"
                  value={rankYear}
                  onChange={(e) => setRankYear(e.target.value)}
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                >
                  {rankYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-left">연도</th>
                    {monthLabels.map((m) => (
                      <th key={m} className="p-1 text-center">
                        {m}월
                      </th>
                    ))}
                    <th className="p-1 text-center">합계</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1 font-medium">{rankYear}</td>
                    {monthLabels.map((m) => {
                      const yNum = Number(rankYear);
                      const mNum = Number(m);
                      const future =
                        yNum > cy || (yNum === cy && mNum > cm);
                      const v = personRow[m];
                      return (
                        <td key={m} className="p-1 text-center tabular-nums">
                          {future ? "—" : (v ?? 0)}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center font-medium tabular-nums">
                      {monthLabels.reduce((s, m) => s + (personRow[m] ?? 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">내전 참여·경기 수</CardTitle>
              <CardDescription>선택 연도의 월별 막대 (1~12월)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium">서로 다른 참여 멤버 수</p>
                <MiniBars values={partVals} labels={monthLabels} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">내전 경기 횟수</p>
                <MiniBars values={intraVals} labels={monthLabels} />
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">
            CSV 내보내기(D-STATS-04)는 권한 키{" "}
            <code className="text-foreground">export_csv</code> 보유자 대상으로 Phase
            2+ 에서 UI 연결합니다.
            {model.permissions.exportCsv
              ? " 현재 계정에 해당 권한이 있습니다."
              : ""}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
