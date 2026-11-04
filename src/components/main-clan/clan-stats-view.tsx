"use client";

import { useTranslator } from "#use-translator";
import { formatPercent } from "@/lib/format-percent";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClanStatsArchive } from "./clan-stats-archive";
import { saveClanHofConfigFormAction } from "@/app/actions/clan-stats-hof";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PeriodSelect } from "@/components/ui/period-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import type { ResolvedHofConfig } from "@/lib/clan/stats/hof-config";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { cn } from "@/lib/utils";
import { HofEligibilitySettings } from "./hof-eligibility-settings";
import { PERSONAL_STATS_SECTIONS } from "@/lib/clan/stats/personal-visibility";
import { StatHelp, StatHelpIcon } from "./stat-help";
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
  const tx = useTranslator();
  return (
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <h4 className="flex items-center gap-2 text-foreground text-sm font-semibold">
        <Trophy className="size-4 text-amber-500" aria-hidden="true" />
        {title}
      </h4>
      {empty ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
          {tx("아직 등재 기준을 충족한 멤버가 없습니다.")}
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
  scope = "all",
}: {
  gameSlug: string;
  clanId: string;
  cfg: ResolvedHofConfig;
  exposeHof: boolean;
  isLeader: boolean;
  onDone: () => void;
  scope?: "all" | "hof" | "personal";
}) {
  const tx = useTranslator();
  const [pending, start] = useTransition();
  const [personalSections, setPersonalSections] = useState(cfg.memberPersonalSections);
  const profileLabel = tx("명예의 전당을 클랜 프로필에 공개");
  const profileSwitch = <div className="flex items-center justify-between gap-3 text-sm">
    <div className="flex items-center gap-1"><label htmlFor="expose_hof" className="cursor-pointer">{profileLabel}</label>
      <StatHelpIcon title={profileLabel} help="클랜 프로필을 방문한 사람에게 공개합니다." />
    </div>
    <Switch id="expose_hof" name="expose_hof" defaultChecked={exposeHof} />
  </div>;
  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      action={async (fd) => {
        start(async () => {
          try {
            await saveClanHofConfigFormAction(gameSlug, clanId, fd);
            toast.success(tx(scope === "personal" ? "개인 기록 설정을 저장했습니다." : "명예의 전당 설정을 저장했습니다."));
            onDone();
          } catch {
            toast.error(
              tx("설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주십시오."),
            );
          }
        });
      }}
    >
      <input type="hidden" name="settings_scope" value={scope} />
      <fieldset disabled={pending} className="flex min-h-0 flex-1 flex-col px-5">
      {scope === "personal" ? <div className="board-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
        {PERSONAL_STATS_SECTIONS.filter(({ id }) => personalSections.includes(id)).map(({ id }) => <input key={id} type="hidden" name="member_personal_sections" value={id} />)}
      <section className="space-y-4 rounded-xl border p-4" aria-label={tx("공개할 통계")}>
        <h4 className="text-sm font-semibold"><StatHelp title={tx("공개할 통계")}>{tx("엠블럼은 항상 기본으로 표시됩니다.")}</StatHelp></h4>
        {PERSONAL_STATS_SECTIONS.map(({ id, label, description }) => <div key={id} className="flex items-center justify-between gap-3 text-sm">
          <StatHelp title={tx(label)}>{description}</StatHelp>
          <Switch aria-label={tx(label)} checked={personalSections.includes(id)} onChange={event => { const checked = event.currentTarget.checked; setPersonalSections(current => checked ? [...current, id] : current.filter(section => section !== id)); }} />
        </div>)}
      </section></div> : <Tabs defaultValue={scope === "hof" ? "ranking" : "access"} className="min-h-0 flex-1 gap-4">
        <TabsList className={`grid h-10 w-full shrink-0 ${scope === "hof" ? "grid-cols-2" : "grid-cols-3"}`} aria-label={tx("명예의 전당 설정 영역")}>
          {scope === "all" && <TabsTrigger value="access">{tx("열람·공개")}</TabsTrigger>}
          <TabsTrigger value="ranking">{tx("순위 공개")}</TabsTrigger>
          <TabsTrigger value="eligibility">{tx("등재 기준")}</TabsTrigger>
        </TabsList>
        <div className="board-scroll min-h-0 flex-1 overflow-y-auto pb-1">
      {scope === "all" && <TabsContent value="access" keepMounted>
      <section aria-labelledby="hof-access-title" className="space-y-3 rounded-xl border p-4">
      <h4 id="hof-access-title" className="text-sm font-semibold">{tx("열람·공개")}</h4>
      {isLeader && profileSwitch}
      </section>
      </TabsContent>}
      <TabsContent value="ranking" keepMounted className="space-y-4">
      {scope === "hof" && isLeader && <section className="space-y-3 rounded-xl border p-4" aria-label={tx("프로필 공개")}>
        <h4 className="text-sm font-semibold">{tx("프로필 공개")}</h4>
        {profileSwitch}
      </section>}
      <section aria-labelledby="hof-ranking-title" className="space-y-3 rounded-xl border p-4">
      <h4 id="hof-ranking-title" className="text-sm font-semibold">{tx("순위 공개 범위")}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="win_rate_visible_top">{tx("승률 순위 공개(구성원)")}</Label>
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
                {n === 0 ? tx("비공개") : n === 999 ? tx("전체") : tx("상위 {0}명", n)}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="wins_visible_top" value={String(cfg.winsVisibleTop)} />
        <input type="hidden" name="streak_visible_top" value={String(cfg.streakVisibleTop)} />
        <div className="space-y-1">
          <Label htmlFor="prediction_visible_top">{tx("승부예측 순위 공개")}</Label>
          <select id="prediction_visible_top" name="prediction_visible_top" defaultValue={String(cfg.predictionVisibleTop)} className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm">
            {TOP_OPTIONS.map((n) => <option key={n} value={n}>{n === 0 ? tx("비공개") : n === 999 ? tx("전체") : tx("상위 {0}명", n)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="participation_visible_top">{tx("내전 참여 순위 공개")}</Label>
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
                {n === 0 ? tx("비공개") : n === 999 ? tx("전체") : tx("상위 {0}명", n)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cumulative_visible_top">{tx("경기 출전 순위 공개")}</Label>
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
                {n === 0 ? tx("비공개") : n === 999 ? tx("전체") : tx("상위 {0}명", n)}
              </option>
            ))}
          </select>
        </div>
      </div>
      </section>
      <section aria-labelledby="hof-period-title" className="space-y-3 rounded-xl border p-4">
      <h4 id="hof-period-title" className="text-sm font-semibold">{tx("공개 시점")}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="monthly_rank_visibility">{tx("월별 순위")}</Label>
          <select
            id="monthly_rank_visibility"
            name="monthly_rank_visibility"
            defaultValue={cfg.monthlyRankVisibility}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            <option value="month_start">{tx("매월 1일")}</option>
            <option value="always">{tx("상시")}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="yearly_rank_visibility">{tx("연도별 순위")}</Label>
          <select
            id="yearly_rank_visibility"
            name="yearly_rank_visibility"
            defaultValue={cfg.yearlyRankVisibility}
            className={cn(
              "border-input bg-background h-9 w-full rounded-md border px-2 text-sm",
            )}
          >
            <option value="year_start">{tx("매년 1월 1일")}</option>
            <option value="always">{tx("상시")}</option>
          </select>
        </div>
      </div>
      </section>
      </TabsContent>
      <TabsContent value="eligibility" keepMounted>
        <HofEligibilitySettings cfg={cfg} />
      </TabsContent>
        </div>
      </Tabs>}
      </fieldset>
      <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
        <Button type="button" variant="outline" disabled={pending} onClick={onDone}>{tx("취소")}</Button>
        <Button type="submit" disabled={pending}>
          {pending ? tx("저장 중…") : tx("저장")}
        </Button>
      </div>
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
  const tx = useTranslator();
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
              {tx(labels[index])}{tx("월")}
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
  const tx = useTranslator();
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
          <h2 className="text-xl font-bold tracking-tight">{tx("클랜 통계")}</h2>
          <p className="text-muted-foreground mt-2 text-xs">
            {tx("함께 쌓아온 기록. 경기와 멤버의 활동을 한눈에 살펴보십시오.")}
          </p>
        </div>
        {model.hof.exposeHof ? (
          <Badge variant="secondary">{tx("명예의 전당 공개 중")}</Badge>
        ) : null}
      </div>

      <Tabs defaultValue={defaultMainTab} className="w-full">
        <TabsList
          variant="line"
          className="mb-4 w-full flex-wrap justify-start gap-2 border-b sm:gap-5"
        >
          <TabsTrigger value="summary">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            {tx("요약")}
          </TabsTrigger>
          <TabsTrigger value="hof">
            <Crown className="hidden size-3.5 sm:block" aria-hidden="true" />
            {tx("명예의 전당")}
          </TabsTrigger>
          {showArchive ? (
            <TabsTrigger value="archive">
              <Swords className="hidden size-3.5 sm:block" aria-hidden="true" />
              {tx("경기 기록")}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="rankmap">
            <Activity className="hidden size-3.5 sm:block" aria-hidden="true" />
            {tx("앱 이용")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="relative min-h-44 border border-primary/15 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs text-muted-foreground">
                  {tx("전체 경기 수")}
                  <Swords className="size-5 text-primary" aria-hidden="true" />
                </CardTitle>
                <CardDescription>{tx("종료된 경기 합계")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold tracking-tight tabular-nums">
                  {model.summary.totalMatches}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {tx("내전")} {model.summary.intraCount} {tx("· 스크림")}{" "}
                  {model.summary.scrimCount}
                  {model.summary.eventCount
                    ? tx(" · 이벤트 {0}", model.summary.eventCount)
                    : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-44 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-xs text-muted-foreground">
                  {tx("구성원")}
                  <Users className="size-5 text-team-blue" aria-hidden="true" />
                </CardTitle>
                <CardDescription>{tx("현재 클랜 소속 인원")}</CardDescription>
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
                  {tx("클랜 설립일")}
                  <CalendarDays
                    className="size-5 text-emerald-500"
                    aria-hidden="true"
                  />
                </CardTitle>
                <CardDescription>{tx("클랜 생성일 (KST 표시)")}</CardDescription>
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
                <CardTitle className="text-base">{tx("명예의 전당")}</CardTitle>
                <CardDescription>
                  {tx("우리 클랜의 기록을 만들어가는 멤버들")}
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
                    {tx("설정")}
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <div className="flex items-center gap-1">
                        <DialogTitle>{tx("명예의 전당 설정")}</DialogTitle>
                        <StatHelpIcon title="명예의 전당 설정" help="순위 공개 범위와 등재 기준을 정합니다." />
                      </div>
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
                  <TabsTrigger value="all">{tx("전체")}</TabsTrigger>
                  <TabsTrigger value="month">{tx("이번 달 (")}{cm}{tx("월)")}</TabsTrigger>
                  <TabsTrigger value="year">{tx("올해 (")}{cy})</TabsTrigger>
                </TabsList>
                {(["all", "month", "year"] as const).map((key) => {
                  const block = model.hof.periods[key];
                  return (
                    <TabsContent key={key} value={key} className="space-y-6">
                      {block.undisclosed ? (
                        <p className="text-muted-foreground text-sm">
                          {tx(block.undisclosedHint)}
                        </p>
                      ) : (
                        <>
                          <HofTable
                            title={tx("승률 순위")}
                            empty={block.winRate.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">
                                    {tx("닉네임")}
                                  </th>
                                  <th className="px-3 py-2 text-right">{tx("승")}</th>
                                  <th className="px-3 py-2 text-right">{tx("패")}</th>
                                  <th className="px-3 py-2 text-right">{tx("승률")}</th>
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
                                        : formatPercent(r.ratePct)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HofTable>
                          <HofTable
                            title={tx("참여율 순위")}
                            empty={block.participation.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">
                                    {tx("닉네임")}
                                  </th>
                                  <th className="px-3 py-2 text-right">{tx("출전")}</th>
                                  <th className="px-3 py-2 text-right">
                                    {tx("참여율")}
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
                                      {formatPercent(r.ratePct)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </HofTable>
                          <HofTable
                            title={tx("누적 출전")}
                            empty={block.cumulative.length === 0}
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">#</th>
                                  <th className="px-3 py-2 text-left">
                                    {tx("닉네임")}
                                  </th>
                                  <th className="px-3 py-2 text-right">
                                    {tx("출전 수")}
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
                  {tx("경기 기록")}{" "}
                  <span className="ml-2 rounded-full bg-muted px-2 py-1 text-[9px] text-muted-foreground">
                    {tx("운영진")}
                  </span>
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {tx("날짜별로 종료된 경기를 확인하십시오.")}
                </p>
              </div>
              <ClanStatsArchive archive={model.archive} />
            </section>
          </TabsContent>
        ) : null}

        <TabsContent value="rankmap" className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{tx("월별 클랜 활동")}</CardTitle>
              <CardDescription>
                {tx("멤버가 클랜에 처음 방문한 날마다 1회 집계합니다. 같은 날의 추가 방문은 중복 계산하지 않습니다.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              <div className="flex flex-wrap items-center gap-2">
                <PeriodSelect label={tx("클랜 활동 연도")} value={rankYear} onChange={setRankYear} options={rankYears.map((id) => ({ id, label: `${id}년` }))} />
              </div>
              <table
                aria-label={tx("월별 클랜 활동일")}
                className="w-full min-w-[620px] overflow-hidden rounded-lg text-xs [&_th]:bg-muted/40 [&_th]:py-3 [&_td]:py-4 [&_td]:border-b [&_td]:border-border/60"
              >
                <thead>
                  <tr>
                    <th className="p-1 text-left">{tx("연도")}</th>
                    {monthLabels.map((m) => (
                      <th key={m} className="p-1 text-center">
                        {m}{tx("월")}
                      </th>
                    ))}
                    <th className="p-1 text-center">{tx("합계")}</th>
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
              <CardTitle className="text-base">{tx("내전 참여·경기 수")}</CardTitle>
              <CardDescription>{tx("선택 연도의 월별 막대 (1~12월)")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium">
                  {tx("서로 다른 참여 멤버 수")}
                </p>
                <MiniBars
                  values={partVals}
                  labels={monthLabels}
                  title={rankYear + "년 월별 내전 참여 멤버 수"}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{tx("내전 경기 횟수")}</p>
                <MiniBars
                  values={intraVals}
                  labels={monthLabels}
                  title={rankYear + "년 월별 내전 경기 수"}
                />
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">
            {tx("미래 월은 집계 전으로 표시됩니다. 내전 참여 인원은 같은 달의 중복 출전을 제외한 멤버 수입니다.")}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
