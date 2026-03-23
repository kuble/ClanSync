"use client";

import { Swords, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { ProFeatureBadge } from "./pro-feature-badge";

type Role = "tank" | "dps" | "support";

interface RosterRow {
  name: string;
  tag: string;
  role: Role;
  manual: number;
  auto: number;
}

const MOCK_MATCHES = [
  { id: "m1", label: "3/22 토요 내전 — 오후 9시", status: "draft" as const },
  { id: "m2", label: "3/20 목요 스크림 vs Nova", status: "finished" as const },
  { id: "m3", label: "3/18 화요 내전", status: "finished" as const },
];

const TEAM_A: RosterRow[] = [
  { name: "IronWall", tag: "#1122", role: "tank", manual: 1.2, auto: 0.8 },
  { name: "Pulse", tag: "#3344", role: "dps", manual: 0.5, auto: 1.1 },
  { name: "Violet", tag: "#5566", role: "dps", manual: -0.3, auto: 0.2 },
  { name: "Mender", tag: "#7788", role: "support", manual: 0.9, auto: 1.0 },
  { name: "Beacon", tag: "#9900", role: "support", manual: 0.4, auto: 0.6 },
];

const TEAM_B: RosterRow[] = [
  { name: "Anchor", tag: "#2211", role: "tank", manual: 0.7, auto: 0.9 },
  { name: "Spark", tag: "#4433", role: "dps", manual: 1.0, auto: 0.4 },
  { name: "Razor", tag: "#6655", role: "dps", manual: 0.2, auto: 0.5 },
  { name: "Bloom", tag: "#8877", role: "support", manual: -0.2, auto: 0.3 },
  { name: "Echo", tag: "#0099", role: "support", manual: 0.6, auto: 0.7 },
];

function roleLabel(r: Role) {
  if (r === "tank") return "탱";
  if (r === "dps") return "딜";
  return "힐";
}

function roleColor(r: Role) {
  if (r === "tank") return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  if (r === "dps") return "border-rose-500/40 bg-rose-500/10 text-rose-200";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
}

function RosterTable({ team, title }: { team: RosterRow[]; title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Users className="text-muted-foreground size-4" aria-hidden />
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">({team.length}인)</span>
      </div>
      <ul className="divide-y divide-border">
        {team.map((p) => (
          <li
            key={p.tag}
            className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
          >
            <span className="min-w-[7rem] font-medium">
              {p.name}
              <span className="text-muted-foreground font-normal">
                {" "}
                {p.tag}
              </span>
            </span>
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold", roleColor(p.role))}
            >
              {roleLabel(p.role)}
            </Badge>
            <span className="text-muted-foreground ml-auto tabular-nums text-xs">
              수동{" "}
              <span className="text-foreground font-medium">{p.manual.toFixed(1)}</span>
              {" · "}자동{" "}
              <span className="text-foreground font-medium">{p.auto.toFixed(1)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BalanceBoardMock() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">밸런스메이커</h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            출전 명단·포지션·수동/자동 점수를 한 화면에서 구성합니다. (목업 · 클릭
            동작 없음)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline">
            새 경기 만들기
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled>
            팀 자동 밸런싱
            <ProFeatureBadge className="ml-1.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue={MOCK_MATCHES[0].id}>
        <TabsList variant="line" className="w-full min-w-0 flex-wrap justify-start">
          {MOCK_MATCHES.map((m) => (
            <TabsTrigger key={m.id} value={m.id} className="max-w-[220px] shrink">
              <span className="truncate">{m.label}</span>
              <Badge
                variant={m.status === "draft" ? "default" : "outline"}
                className="ml-1.5 shrink-0 text-[10px]"
              >
                {m.status === "draft" ? "작성중" : "종료"}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {MOCK_MATCHES.map((m) => (
          <TabsContent key={m.id} value={m.id} className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{m.label}</CardTitle>
                  <Badge variant="outline">맵: 서킷 로얄</Badge>
                  <Badge variant="outline">제어</Badge>
                </div>
                <CardDescription>
                  상태:{" "}
                  {m.status === "draft"
                    ? "draft — 운영진만 편집"
                    : "finished — 결과 확정"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {m.status === "draft" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm">
                      출전 명단 편집
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled>
                      OCR로 닉 입력
                      <ProFeatureBadge className="ml-1.5" />
                    </Button>
                    <Button type="button" size="sm" variant="outline">
                      경기 시작 (active)
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    종료된 경기입니다. 통계 탭에서 상세 집계로 이어집니다.
                  </p>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <RosterTable team={TEAM_A} title="A팀" />
                  <RosterTable team={TEAM_B} title="B팀" />
                </div>

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Swords className="text-muted-foreground size-4" aria-hidden />
                    승률 예측 (목업)
                    <ProFeatureBadge />
                  </div>
                  <div className="grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                    <div className="text-right font-semibold text-sky-300">A팀 52%</div>
                    <div className="bg-muted relative h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-sky-500/80 absolute inset-y-0 left-0 w-[52%] rounded-l-full"
                        aria-hidden
                      />
                    </div>
                    <div className="font-semibold text-rose-300">B팀 48%</div>
                  </div>
                </div>

                <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                  <span>특이 태그 (자동 생성 목업):</span>
                  <Badge variant="secondary">탱 불균형</Badge>
                  <Badge variant="secondary">힐 시너지↑</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
