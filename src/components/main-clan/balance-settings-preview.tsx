"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Ban, Check, Timer } from "lucide-react";
import type { FormationSettings } from "@/lib/balance/formation";
import type { BanSettings } from "@/lib/balance/prematch";
import type { BalanceRoster } from "@/lib/balance/roster-schema";
import type { ScoreMode } from "@/lib/balance/score-display";
import type { PlayerSessionInfo } from "@/lib/balance/player-session-stats";
import { mapPoolForGameSlug } from "@/lib/balance/map-pools";
import { OW_HEROES } from "@/lib/balance/ow-hero-ban";
import { OW_HERO_PORTRAITS } from "@/lib/balance/ow-hero-portraits";
import { cn } from "@/lib/utils";
import { BalancePlayerCardContent, BalancePlayerDetails } from "./balance-player-details";
import { BalanceTeamHeading } from "./clan-balance-roster-board";
import { ScoreModeToggle } from "./balance-team-insights";
import { BalanceMapImage } from "./clan-balance-map-image";
import styles from "./clan-balance-settings.module.css";

// These examples stay local to the settings dialog and never submit game input.
const names = ["네온", "달빛", "새벽", "루나", "바람", "에임", "여우", "구름", "모찌", "감자"];
const roster: BalanceRoster = {
  team1: { tank: "2", dmg: ["0", "1"], sup: ["3", "4"] },
  team2: { tank: "7", dmg: ["5", "6"], sup: ["8", "9"] },
};
const scores = Object.fromEntries(names.map((_, index) => [String(index), { m: index < 5 ? 1.2 : -0.8, a: index < 5 ? 2.1 : 1.4 }]));
const info: PlayerSessionInfo = { wins: 3, draws: 0, losses: 1, winRate: 75, currentStreak: 2, micAvailable: null };

export function BalanceDisplayPreview({ settings, premium, regularRoom }: {
  settings: FormationSettings; premium: boolean; regularRoom: boolean;
}) {
  const [mode, setMode] = useState<ScoreMode>("m");
  const scoreMode = premium ? mode : "m";
  return <section aria-label="화면 표시 미리보기" className="overflow-hidden rounded-xl border bg-background" data-testid="balance-display-preview">
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <h3 className="text-sm font-semibold">화면 표시 미리보기</h3>
      <span className="text-xs text-muted-foreground">편성 화면</span>
    </header>
    <div className="space-y-5 p-4 sm:p-6">
      <ScoreModeToggle value={scoreMode} onChange={setMode} premium={premium} />
      <div className={styles.previewTeamHeading} data-testid="display-preview-team-heading">
        <BalanceTeamHeading roster={roster} scores={scores} mode={scoreMode} premium={premium}
          showPrediction={premium && regularRoom} samplePrediction showSummary={settings.showTeamComparisonSummary}
          comparisonMode={settings.teamComparisonMode} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 5].map((index) => <BalancePlayerDetails key={index} nickname={names[index]} info={info} score={scores[String(index)]}
          premium={premium} enabled={settings.showPlayerSessionSummary}>
          <button type="button" aria-label={`${names[index]} 카드 미리보기`} data-testid={`display-preview-card-${index}`}
            className={cn("flex min-h-24 min-w-0 items-center rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-ring sm:p-4",
              index === 0 ? "border-sky-500/40 bg-sky-500/10" : "border-rose-500/40 bg-rose-500/10")}>
            <BalancePlayerCardContent nickname={names[index]} info={info} score={scores[String(index)]} mode={scoreMode}
              showScore={settings.showPlayerCardScore} showInfo={settings.showPlayerCardInfo} infoMode={settings.playerCardInfo} mirrored={index === 5} />
          </button>
        </BalancePlayerDetails>)}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">카드와 팀 그래프에 마우스를 올려 상세 정보도 확인하세요.</p>
    </div>
    <footer className="border-t bg-muted/15 px-4 py-3 text-xs text-muted-foreground">예시 화면 · 설정 적용 전에는 실제 경기에 반영되지 않습니다.</footer>
  </section>;
}

export type BanPreviewStage = "map" | "hero" | "match";

export function BalanceBanPreview({ gameSlug, mapEnabled, heroEnabled, settings, stage, onStageChange, predictionEnabled, predictionMinutes }: {
  gameSlug: string; mapEnabled: boolean; heroEnabled: boolean; settings: BanSettings;
  stage: BanPreviewStage; onStageChange: (stage: BanPreviewStage) => void; predictionEnabled: boolean; predictionMinutes: number;
}) {
  const maps = mapPoolForGameSlug(gameSlug, settings.mapTypes).slice(0, 3);
  const heroes = OW_HEROES.filter((hero) => ["reinhardt", "tracer", "ana", "mercy"].includes(hero.id));
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [selectedHeroes, setSelectedHeroes] = useState<string[]>(["tracer"]);
  const activeMap = maps.includes(selectedMap ?? "") ? selectedMap! : maps[0];
  const picks = selectedHeroes.slice(0, settings.heroBansPerTeam);
  const activeStage = stage === "map" && !mapEnabled || stage === "hero" && !heroEnabled
    ? mapEnabled ? "map" : heroEnabled ? "hero" : "match" : stage;
  const steps: { id: BanPreviewStage; label: string }[] = [
    ...(mapEnabled ? [{ id: "map" as const, label: "맵 투표" }] : []),
    ...(heroEnabled ? [{ id: "hero" as const, label: "영웅 밴" }] : []),
    { id: "match", label: "경기 시작" },
  ];
  return <section aria-label="밴픽 미리보기" className="overflow-hidden rounded-xl border bg-background" data-testid="balance-ban-preview" data-stage={activeStage}>
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <h3 className="text-sm font-semibold">밴픽 미리보기</h3>
      <span className="text-xs text-muted-foreground">출전자 화면</span>
    </header>
    <nav aria-label="밴픽 진행 순서" className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
      {steps.map((step, index) => <span key={step.id} className="inline-flex items-center gap-2">
        {index > 0 ? <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" /> : null}
        <button type="button" aria-label={`${step.label} 미리보기`} aria-pressed={activeStage === step.id} onClick={() => onStageChange(step.id)}
          className={cn("rounded-md px-2 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring", activeStage === step.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}>
          {step.label}
        </button>
      </span>)}
    </nav>
    <div className="min-h-64 space-y-4 p-4 sm:p-6">
      {activeStage === "map" ? <>
        <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold">맵 투표</h4><span className="inline-flex items-center gap-1 text-sm tabular-nums" data-testid="ban-preview-map-time"><Timer className="size-4" />{settings.mapBanSeconds}초</span></div>
        <p className="text-xs text-muted-foreground">후보 중 한 맵에 투표합니다.</p>
        <div className="grid grid-cols-3 gap-2">
          {maps.map((map) => <button type="button" key={map} aria-label={`${map} 미리보기 투표`} aria-pressed={activeMap === map} onClick={() => setSelectedMap(map)}
            className={cn("min-w-0 overflow-hidden rounded-lg border text-xs focus-visible:outline-2 focus-visible:outline-ring", activeMap === map ? "border-primary ring-1 ring-primary" : "border-border")}>
            <span className="relative block h-20"><BalanceMapImage label={map} sizes="220px" /></span>
            <span className="flex min-h-11 items-center justify-center gap-1 px-1 py-2">{activeMap === map ? <Check className="size-3 shrink-0 text-primary" /> : null}{map}</span>
          </button>)}
        </div>
      </> : activeStage === "hero" ? <>
        <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold">영웅 밴 · 1팀</h4><span className="inline-flex items-center gap-1 text-sm tabular-nums" data-testid="ban-preview-hero-time"><Timer className="size-4" />{settings.heroBanSeconds}초</span></div>
        <p className="text-xs text-muted-foreground">팀당 최대 {settings.heroBansPerTeam}명 · 팀 내 득표순으로 결정</p>
        <div className="grid grid-cols-4 gap-2">
          {heroes.map((hero) => <button type="button" key={hero.id} aria-label={`${hero.nameKo} 미리보기 밴`} aria-pressed={picks.includes(hero.id)} onClick={() => setSelectedHeroes(picks.includes(hero.id) ? picks.filter((id) => id !== hero.id) : [...picks, hero.id].slice(-settings.heroBansPerTeam))}
            className={cn("relative min-w-0 overflow-hidden rounded-lg border bg-muted/25 text-xs focus-visible:outline-2 focus-visible:outline-ring", picks.includes(hero.id) ? "border-amber-500 ring-1 ring-amber-500" : "border-border")}>
            <Image src={OW_HERO_PORTRAITS[hero.id]} alt="" width={104} height={112} unoptimized className="h-20 w-full object-contain" />
            {picks.includes(hero.id) ? <Ban className="absolute left-1/2 top-7 size-6 -translate-x-1/2 text-amber-400" aria-hidden="true" /> : null}
            <span className="block truncate px-1 py-2">{hero.nameKo}</span>
          </button>)}
        </div>
      </> : <>
        <h4 className="text-sm font-bold">경기 시작</h4>
        <div className="relative flex min-h-24 items-end overflow-hidden rounded-xl border"><BalanceMapImage label={activeMap} sizes="660px" /><strong className="relative z-10 w-full bg-linear-to-t from-black/80 to-black/20 p-4 text-sm text-white">경기 맵 · {activeMap}</strong></div>
        <p className="text-xs text-muted-foreground">{mapEnabled ? "투표 결과로 맵 결정" : "편성에서 선택한 맵으로 진행"}{heroEnabled ? ` · 팀당 ${settings.heroBansPerTeam}명 영웅 밴 반영` : " · 영웅 밴 없이 진행"}</p>
        {predictionEnabled ? <p className="text-xs text-primary">관전자 승부예측 · 경기 시작 후 {predictionMinutes}분 마감</p> : null}
      </>}
    </div>
    <footer className="border-t bg-muted/15 px-4 py-3 text-xs text-muted-foreground">예시 화면 · 투표와 밴 선택은 저장되지 않습니다.</footer>
  </section>;
}
