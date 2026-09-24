"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClanStatsArchive } from "./clan-stats-archive";
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
  DialogDescription,
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
import {
  Activity,
  BarChart3,
  CalendarDays,
  Crown,
  Settings2,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

const TOP_OPTIONS = [0, 3, 5, 10, 20, 999] as const;

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
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <h4 className="flex items-center gap-2 text-foreground text-sm font-semibold">
        <Trophy className="size-4 text-amber-500" aria-hidden="true" />
        {title}
      </h4>
      {empty ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
          아직 등재 기준을 충족한 멤버가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-border">
          {children}
        </div>
      )}
    </div>
  );
}

export function HofSettingsForm({
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
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4 pt-2"
      action={async (fd) => {
        start(async () => {
          try {
            await saveClanHofConfigFormAction(gameSlug, clanId, fd);
            toast.success("명예의 전당 설정을 저장했습니다.");
            onDone();
          } catch {
            toast.error(
              "설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
          }
        });
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
                {n === 0 ? "비공개" : n === 999 ? "전체" : `상위 ${n}명`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="wins_visible_top">다승 순위 공개</Label>
          <select id="wins_visible_top" name="wins_visible_top" defaultValue={String(cfg.winsVisibleTop)} className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm">
            {TOP_OPTIONS.map((n) => <option key={n} value={n}>{n === 0 ? "비공개" : n === 999 ? "전체" : `상위 ${n}명`}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="streak_visible_top">최장 연승 순위 공개</Label>
          <select id="streak_visible_top" name="streak_visible_top" defaultValue={String(cfg.streakVisibleTop)} className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm">
            {TOP_OPTIONS.map((n) => <option key={n} value={n}>{n === 0 ? "비공개" : n === 999 ? "전체" : `상위 ${n}명`}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="prediction_visible_top">승부예측 순위 공개</Label>
          <select id="prediction_visible_top" name="prediction_visible_top" defaultValue={String(cfg.predictionVisibleTop)} className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm">
            {TOP_OPTIONS.map((n) => <option key={n} value={n}>{n === 0 ? "비공개" : n === 999 ? "전체" : `상위 ${n}명`}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="participation_visible_top">세션 참여 순위 공개</Label>
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
                {n === 0 ? "비공개" : n === 999 ? "전체" : `상위 ${n}명`}
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
                {n === 0 ? "비공개" : n === 999 ? "전체" : `상위 ${n}명`}
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
          <Label htmlFor="eligibility_game_threshold">
            등재 기준 — 클랜 총 경기 수 기준점
          </Label>
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
          <Label htmlFor="eligibility_below_pct">
            기준점 이하일 때 최소 참여 비율(%)
          </Label>
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
          <Label htmlFor="eligibility_above_min_games">
            기준점 초과 시 최소 출전 수
          </Label>
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
          <span>명예의 전당을 클랜 프로필에 공개</span>
        </label>
      ) : null}
      <DialogFooter className="gap-2 sm:justify-end">
        <DialogClose render={<Button type="button" variant="outline" />}>
          취소
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function MiniBars({
  values,
  labels,
  title,
}: {
  values: (number | null)[];
  labels: string[];
  title: string;
}) {
  const max = Math.max(1, ...values.map((value) => value ?? 0));
  return (
    <div className="overflow-x-auto">
      <div
        role="img"
        aria-label={
          title +
          ". " +
          labels
            .map(
              (label, index) =>
                label +
                "월 " +
                (values[index] === null ? "집계 전" : values[index]),
            )
            .join(", ")
        }
        className="relative flex min-w-[440px] gap-2 pt-4"
      >
        {values.map((value, index) => (
          <div
            key={labels[index]}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="h-4 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {value ?? "—"}
            </span>
            <div className="flex h-32 w-full items-end justify-center border-b border-border bg-[linear-gradient(to_top,transparent_49%,var(--border)_50%,transparent_51%)]">
              <div
                className="w-full max-w-8 rounded-t bg-primary/65"
                style={{
                  height: value === null ? 0 : (value / max) * 100 + "%",
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {labels[index]}월
            </span>
          </div>
        ))}
      </div>
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
  const monthValue = (row: Record<string, number>, m: string) =>
    Number(rankYear) > cy || (Number(rankYear) === cy && Number(m) > cm)
      ? null
      : (row[m] ?? 0);
  const intraVals = monthLabels.map((m) => monthValue(intraRow, m));
  const partVals = monthLabels.map((m) => monthValue(partRow, m));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">클랜 통계</h2>
          <p className="text-muted-foreground mt-2 text-xs">
            함께 쌓아온 기록. 경기와 멤버의 활동을 한눈에 살펴보세요.
          </p>
        </div>
        {model.hof.exposeHof ? (
          <Badge variant="secondary">명예의 전당 공개 중</Badge>
        ) : null}
      </div>

      <Tabs defaultValue={defaultMainTab} className="w-full">
        <TabsList
          variant="line"
          className="mb-4 w-full flex-wrap justify-start gap-2 border-b sm:gap-5"
        >
          <TabsTrigger value="summary">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            요약
          </TabsTrigger>
          <TabsTrigger value="hof">
            <Crown className="hidden size-3.5 sm:block" aria-hidden="true" />
            명예의 전당
          </TabsTrigger>
          {showArchive ? (
            <TabsTrigger value="archive">
              <Swords className="hidden size-3.5 sm:block" aria-hidden="true" />
              경기 기록
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="rankmap">
            <Activity className="hidden size-3.5 sm:block" aria-hidden="true" />
            앱 이용
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="relative min-h-44 border border-primary/15 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs text-muted-foreground">
                  전체 경기 수
                  <Swords className="size-5 text-primary" aria-hidden="true" />
                </CardTitle>
                <CardDescription>종료된 경기 합계</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold tracking-tight tabular-nums">
                  {model.summary.totalMatches}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  내전 {model.summary.intraCount} · 스크림{" "}
                  {model.summary.scrimCount}
                  {model.summary.eventCount
                    ? ` · 이벤트 ${model.summary.eventCount}`
                    : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-44 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs text-muted-foreground">
                  구성원
                  <Users className="size-5 text-sky-500" aria-hidden="true" />
                </CardTitle>
                <CardDescription>현재 클랜 소속 인원</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold tracking-tight tabular-nums">
                  {model.summary.memberCount}
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-44 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs text-muted-foreground">
                  클랜 설립일
                  <CalendarDays
                    className="size-5 text-emerald-500"
                    aria-hidden="true"
                  />
                </CardTitle>
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
                  우리 클랜의 기록을 만들어가는 멤버들
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
                      <DialogDescription>
                        순위 공개 범위와 등재 기준을 정합니다.
                      </DialogDescription>
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
                            title="승률 순위"
                            empty={block.winRate.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">
                                    닉네임
                                  </th>
                                  <th className="px-3 py-2 text-right">승</th>
                                  <th className="px-3 py-2 text-right">패</th>
                                  <th className="px-3 py-2 text-right">승률</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.winRate.map((r, i) => (
                                  <tr
                                    key={r.userId}
                                    className="border-t border-border/70 odd:bg-muted/10"
                                  >
                                    <td className="px-3 py-2">
                                      <span
                                        className={cn(
                                          "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                                          i === 0
                                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {i + 1}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">{r.nickname}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.wins}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.losses}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {r.ratePct == null
                                        ? "—"
                                        : `${r.ratePct}%`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HofTable>
                          <HofTable
                            title="참여율 순위"
                            empty={block.participation.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">
                                    닉네임
                                  </th>
                                  <th className="px-3 py-2 text-right">출전</th>
                                  <th className="px-3 py-2 text-right">
                                    참여율
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.participation.map((r, i) => (
                                  <tr
                                    key={r.userId}
                                    className="border-t border-border/70 odd:bg-muted/10"
                                  >
                                    <td className="px-3 py-2">
                                      <span
                                        className={cn(
                                          "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                                          i === 0
                                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {i + 1}
                                      </span>
                                    </td>
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
                            title="누적 출전"
                            empty={block.cumulative.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">
                                    닉네임
                                  </th>
                                  <th className="px-3 py-2 text-right">
                                    출전 수
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.cumulative.map((r, i) => (
                                  <tr
                                    key={r.userId}
                                    className="border-t border-border/70 odd:bg-muted/10"
                                  >
                                    <td className="px-3 py-2">
                                      <span
                                        className={cn(
                                          "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                                          i === 0
                                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {i + 1}
                                      </span>
                                    </td>
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
          <TabsContent value="archive">
            <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold">
                  경기 기록{" "}
                  <span className="ml-2 rounded-full bg-muted px-2 py-1 text-[9px] text-muted-foreground">
                    운영진
                  </span>
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  날짜별로 종료된 경기를 확인하세요.
                </p>
              </div>
              <ClanStatsArchive archive={model.archive} />
            </section>
          </TabsContent>
        ) : null}

        <TabsContent value="rankmap" className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">월별 클랜 활동</CardTitle>
              <CardDescription>
                멤버가 클랜에 처음 방문한 날마다 1회 집계합니다. 같은 날의 추가
                방문은 중복 계산하지 않습니다.
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
              <table
                aria-label="월별 클랜 활동일"
                className="w-full min-w-[620px] overflow-hidden rounded-lg text-xs [&_th]:bg-muted/40 [&_th]:py-3 [&_td]:py-4 [&_td]:border-b [&_td]:border-border/60"
              >
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
                      const future = yNum > cy || (yNum === cy && mNum > cm);
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
                <p className="mb-2 text-sm font-medium">
                  서로 다른 참여 멤버 수
                </p>
                <MiniBars
                  values={partVals}
                  labels={monthLabels}
                  title={rankYear + "년 월별 내전 참여 멤버 수"}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">내전 경기 횟수</p>
                <MiniBars
                  values={intraVals}
                  labels={monthLabels}
                  title={rankYear + "년 월별 내전 경기 수"}
                />
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">
            미래 월은 집계 전으로 표시됩니다. 내전 참여 인원은 같은 달의 중복
            출전을 제외한 멤버 수입니다.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
