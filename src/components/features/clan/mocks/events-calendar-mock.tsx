"use client";

import { CalendarDays, Clock, MapPin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const EVENTS = [
  {
    id: "e1",
    title: "금요 정기 내전",
    type: "내전" as const,
    day: "3월 28일 (금)",
    time: "21:00",
    place: "디스코드 #내전",
    note: "6인 팟 2개 예정",
  },
  {
    id: "e2",
    title: "스크림 vs Team Nova",
    type: "스크림" as const,
    day: "3월 30일 (일)",
    time: "20:00",
    place: "인게임",
    note: "맵풀 공유 완료",
  },
  {
    id: "e3",
    title: "시즌 맞이 이벤트전",
    type: "이벤트" as const,
    day: "4월 5일 (토)",
    time: "19:30",
    place: "랜덤 드래프트",
    note: "상품: 클랜 코인 (목업)",
  },
];

function typeStyles(t: (typeof EVENTS)[0]["type"]) {
  if (t === "내전") return "border-violet-500/40 bg-violet-500/10 text-violet-200";
  if (t === "스크림") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-cyan-500/40 bg-cyan-500/10 text-cyan-200";
}

const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

export function EventsCalendarMock({ officer }: { officer: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">클랜 이벤트</h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            내전·스크림·이벤트 일정을 등록하고 구성원과 공유합니다. (목업)
          </p>
        </div>
        {officer ? (
          <Button type="button" size="sm" className="shrink-0 gap-1.5">
            <Plus className="size-4" aria-hidden />
            일정 등록
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="list">
        <TabsList variant="line">
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="calendar">캘린더</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-3">
          {EVENTS.map((ev) => (
            <Card key={ev.id} size="sm">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{ev.title}</CardTitle>
                  <Badge variant="outline" className={cn("text-[10px]", typeStyles(ev.type))}>
                    {ev.type}
                  </Badge>
                </div>
                <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5 opacity-70" aria-hidden />
                    {ev.day}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5 opacity-70" aria-hidden />
                    {ev.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 opacity-70" aria-hidden />
                    {ev.place}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {ev.note}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2026년 3월 (목업 그리드)</CardTitle>
              <CardDescription>
                실제 연동 시 월 이동·ICS·알림(카카오/디스코드 PRO)을 붙입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {WEEK_DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-muted-foreground py-2 font-medium"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                  const has = day === 22 || day === 28 || day === 30;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "hover:bg-muted/50 flex min-h-10 flex-col items-center justify-center rounded-md border border-transparent py-1",
                        has && "border-primary/30 bg-primary/5",
                      )}
                    >
                      <span className="tabular-nums">{day}</span>
                      {has ? (
                        <span className="bg-primary/60 mt-0.5 h-1 w-1 rounded-full" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
