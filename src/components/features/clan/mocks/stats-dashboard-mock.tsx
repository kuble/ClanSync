"use client";

import { BarChart3, Flame, Target, TrendingUp } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const KPI = [
  {
    label: "최근 30일 경기",
    value: "24",
    sub: "내전 18 · 스크림 6",
    icon: Target,
  },
  {
    label: "기간 승률",
    value: "58%",
    sub: "지난 달 대비 +4%",
    icon: TrendingUp,
  },
  {
    label: "출석률(평균)",
    value: "82%",
    sub: "신청 대비 실참",
    icon: Flame,
  },
];

const ROLE_BARS = [
  { role: "탱커", pct: 62, wins: "10승 6패" },
  { role: "딜러", pct: 55, wins: "22승 18패" },
  { role: "힐러", pct: 60, wins: "15승 10패" },
];

const RECENT_MATCHES = [
  { date: "3/22", type: "내전", map: "서킷 로얄", result: "승", score: "3-2" },
  { date: "3/20", type: "스크림", map: "파라이소", result: "패", score: "2-3" },
  { date: "3/18", type: "내전", map: "뉴정크시티", result: "승", score: "3-1" },
  { date: "3/15", type: "내전", map: "부산", result: "승", score: "3-0" },
];

const SYNERGY = [
  { a: "IronWall", b: "Mender", games: 12, winRate: "67%" },
  { a: "Pulse", b: "Violet", games: 9, winRate: "44%" },
  { a: "Anchor", b: "Bloom", games: 11, winRate: "55%" },
];

function BarRow({
  label,
  pct,
  detail,
}: {
  label: string;
  pct: number;
  detail: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{detail}</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="from-primary h-full rounded-full bg-gradient-to-r to-violet-500/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StatsDashboardMock({ officer }: { officer: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 통계</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          경기 기록·역할별 승률·최근 추이를 한눈에 봅니다. (목업 데이터)
        </p>
      </div>

      {!officer ? (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">구성원 보기</CardTitle>
            <CardDescription>
              시너지·세부 출석 패턴 등은 운영진 정책에 따라 제한될 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {KPI.map((k) => (
          <Card key={k.label} size="sm">
            <CardHeader className="pb-2">
              <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                <k.icon className="size-3.5" aria-hidden />
                {k.label}
              </div>
              <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
              <CardDescription>{k.sub}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="30d">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="7d">7경기</TabsTrigger>
            <TabsTrigger value="30d">30일</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>
          <Badge variant="outline" className="w-fit text-xs">
            <BarChart3 className="mr-1 size-3" aria-hidden />
            필터는 목업 (연동 전)
          </Badge>
        </div>

        <TabsContent value="7d" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">역할별 승률</CardTitle>
              <CardDescription>최근 7경기 가중 (목업)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ROLE_BARS.map((r) => (
                <BarRow
                  key={r.role}
                  label={r.role}
                  pct={r.pct}
                  detail={r.wins}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="30d" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">역할별 승률</CardTitle>
                <CardDescription>최근 30일</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ROLE_BARS.map((r) => (
                  <BarRow
                    key={r.role}
                    label={r.role}
                    pct={r.pct}
                    detail={r.wins}
                  />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">최근 경기</CardTitle>
                <CardDescription>날짜순 · 편집은 운영진</CardDescription>
              </CardHeader>
              <CardContent>
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
                    {RECENT_MATCHES.map((row) => (
                      <TableRow key={`${row.date}-${row.map}`}>
                        <TableCell className="tabular-nums">{row.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.map}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              row.result === "승"
                                ? "text-emerald-400"
                                : "text-rose-400",
                            )}
                          >
                            {row.result}
                          </span>
                          <span className="text-muted-foreground ml-1 text-xs">
                            {row.score}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              전체 기간 집계 UI는 보관 기간(무료 1년 등) 정책 반영 후 연동
              예정입니다.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {officer ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시너지 스냅샷 (목업)</CardTitle>
            <CardDescription>
              A+B 조합 승률 — 민감 지표는 노출 범위 조정 예정
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>조합</TableHead>
                  <TableHead className="text-right">함께한 경기</TableHead>
                  <TableHead className="text-right">승률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SYNERGY.map((s) => (
                  <TableRow key={`${s.a}-${s.b}`}>
                    <TableCell>
                      {s.a}
                      <span className="text-muted-foreground"> + {s.b}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.games}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {s.winRate}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="opacity-80">
          <CardHeader>
            <CardTitle className="text-base">시너지 매트릭스</CardTitle>
            <CardDescription>운영진 전용 영역 (목업)</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            잠겨 있는 콘텐츠입니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
