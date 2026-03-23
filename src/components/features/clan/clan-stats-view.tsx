import Link from "next/link";
import { BarChart3, Calendar, Target, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clanBasePath } from "@/lib/clan/paths";
import type { ClanStatsViewModel } from "@/lib/clan/clan-stats-types";
import type { ClanSubscriptionTier } from "@/lib/clan/types";
import { cn } from "@/lib/utils";

function statsPath(
  locale: string,
  gameSlug: string,
  clanId: string,
  period: string,
  matchType: string,
): string {
  const base = `${clanBasePath(locale, gameSlug, clanId)}/stats`;
  const q = new URLSearchParams();
  if (period !== "30d") q.set("period", period);
  if (matchType !== "all") q.set("type", matchType);
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

function typeBadgeVariant(
  t: "intra" | "scrim" | "event",
): "default" | "secondary" | "outline" {
  if (t === "intra") return "default";
  if (t === "scrim") return "secondary";
  return "outline";
}

function typeLabel(t: "intra" | "scrim" | "event"): string {
  if (t === "intra") return "내전";
  if (t === "scrim") return "스크림";
  return "이벤트";
}

interface ClanStatsViewProps {
  locale: string;
  gameSlug: string;
  clanId: string;
  clanName: string;
  model: ClanStatsViewModel;
  isOfficer: boolean;
  subscriptionTier: ClanSubscriptionTier;
}

export function ClanStatsView({
  locale,
  gameSlug,
  clanId,
  clanName,
  model,
  isOfficer,
  subscriptionTier,
}: ClanStatsViewProps) {
  const { kpi, archive, participation, mapBreakdown, period, matchType } =
    model;
  const balanceHref = `${clanBasePath(locale, gameSlug, clanId)}/balance`;

  const periodTabs: { id: "30d" | "90d" | "all"; label: string }[] = [
    { id: "30d", label: "최근 30일" },
    { id: "90d", label: "90일" },
    { id: "all", label: "전체" },
  ];
  const typeTabs: { id: "all" | "intra" | "scrim"; label: string }[] = [
    { id: "all", label: "전체 유형" },
    { id: "intra", label: "내전" },
    { id: "scrim", label: "스크림" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">클랜 통계</h2>
        <p className="text-muted-foreground max-w-2xl text-sm">
          <span className="text-foreground font-medium">{clanName}</span>의
          내전·스크림·이벤트 경기를{" "}
          <strong className="text-foreground font-medium">클랜 단위</strong>
          로 집계합니다. 개인 메달·상세 전적은 클랜 관리에서 확인합니다.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground w-full text-xs font-medium sm:w-auto">
            기간
          </span>
          <div className="flex flex-wrap gap-1">
            {periodTabs.map((tab) => (
              <Link
                key={tab.id}
                href={statsPath(locale, gameSlug, clanId, tab.id, matchType)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  period === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground w-full text-xs font-medium sm:w-auto">
            유형
          </span>
          <div className="flex flex-wrap gap-1">
            {typeTabs.map((tab) => (
              <Link
                key={tab.id}
                href={statsPath(locale, gameSlug, clanId, period, tab.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  matchType === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        {subscriptionTier === "free" ? (
          <p className="text-muted-foreground text-xs">
            무료 플랜은 경기 기록 보관이 1년(PRD) — 실서비스에서는 구독에 맞춰
            조회 범위가 잘립니다. (현재 목업은 고정 샘플 데이터)
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader className="pb-2">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Target className="size-3.5" aria-hidden />
              경기 수 (필터 적용)
            </div>
            <CardTitle className="text-2xl tabular-nums">
              {kpi.totalMatches}
            </CardTitle>
            <CardDescription>
              내전 {kpi.intraCount} · 스크림 {kpi.scrimCount}
              {kpi.eventCount > 0 ? ` · 이벤트 ${kpi.eventCount}` : ""}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Trophy className="size-3.5" aria-hidden />
              승률
            </div>
            <CardTitle className="text-2xl tabular-nums">
              {kpi.winRatePct === null ? "—" : `${kpi.winRatePct}%`}
            </CardTitle>
            <CardDescription>
              {kpi.wins}승 {kpi.losses}패
            </CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <BarChart3 className="size-3.5" aria-hidden />
              유형 비중
            </div>
            <CardTitle className="text-2xl tabular-nums">
              {kpi.totalMatches === 0
                ? "—"
                : `${Math.round((kpi.intraCount / kpi.totalMatches) * 100)}%`}
            </CardTitle>
            <CardDescription>내전 비중 (나머지는 스크림·이벤트)</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2">
            <Calendar className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <CardTitle className="text-base">경기 아카이브</CardTitle>
              <CardDescription>
                클랜에 기록된 경기 목록입니다. 필터·기간과 동일한 집계 범위입니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {archive.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              이 조건에 해당하는 경기가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일자</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>맵</TableHead>
                  <TableHead>결과</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archive.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatMatchDate(row.playedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={typeBadgeVariant(row.matchType)}
                        className="text-[10px]"
                      >
                        {typeLabel(row.matchType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{row.mapName}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-semibold",
                          row.clanWon ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {row.clanWon ? "승" : "패"}
                      </span>
                      <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">
                        {row.scoreLabel}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">참여율 순위</CardTitle>
            <CardDescription>
              클랜 경기 데이터 기준 · 기간 필터와 무관한 목업 순위입니다. 실연동 시
              선택 기간에 맞춰 재집계합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>닉네임</TableHead>
                  <TableHead className="text-right">출전</TableHead>
                  <TableHead className="text-right">참여율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participation.map((row) => (
                  <TableRow key={row.displayName}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {row.rank}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.displayName}
                      {row.belowMinSample ? (
                        <span className="text-muted-foreground ml-1 text-xs">
                          *
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.gamesPlayed}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.participationRatePct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-muted-foreground mt-3 text-xs">
              * 출전 {model.minGamesForRanking}경기 미만은 순위 참고용이며, 정책에
              따라 표에서 제외할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">맵·모드별 클랜 승률</CardTitle>
            <CardDescription>
              현재 필터가 적용된 경기만으로 집계합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mapBreakdown.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                집계할 경기가 없습니다.
              </p>
            ) : (
              mapBreakdown.slice(0, 8).map((row) => (
                <div key={`${row.mapName}-${row.mapType}`} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="font-medium">
                      {row.mapName}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {row.mapType}
                      </span>
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {row.games}경기 · 승률{" "}
                      {row.winRatePct === null ? "—" : `${row.winRatePct}%`}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="from-primary h-full rounded-full bg-gradient-to-r to-violet-500/80"
                      style={{
                        width: `${row.winRatePct ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {isOfficer ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">운영진</CardTitle>
            <CardDescription>
              경기 생성·결과 입력은 밸런스메이커에서 진행합니다. 통계는 종료된
              경기를 자동 반영합니다(실연동 예정).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={balanceHref}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              밸런스메이커로 이동 →
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
