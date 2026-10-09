"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minGamesToQualify, resolveHofConfig, type ResolvedHofConfig } from "@/lib/clan/stats/hof-config";
import { cn } from "@/lib/utils";

export function HofEligibilitySettings({ cfg, totalGames = 100 }: { cfg: ResolvedHofConfig; totalGames?: number }) {
  const [threshold, setThreshold] = useState(String(cfg.eligibilityGameThreshold));
  const [percentage, setPercentage] = useState(String(cfg.eligibilityBelowPct));
  const [minimum, setMinimum] = useState(String(cfg.eligibilityAboveMinGames));
  const [games, setGames] = useState(totalGames);
  const [played, setPlayed] = useState(Math.min(10, totalGames));
  const rules = resolveHofConfig({ eligibility_game_threshold: Number(threshold), eligibility_below_pct: Number(percentage), eligibility_above_min_games: Number(minimum) });
  const cutoff = rules.eligibilityGameThreshold;
  const proportional = games <= cutoff;
  const required = minGamesToQualify(games, rules);
  const appearances = Math.min(played, games);
  const qualifies = games > 0 && appearances >= required;
  const maximum = Math.max(200, cutoff * 2, totalGames, games);
  const branch = "min-w-0 space-y-2 rounded-xl border p-3 transition-colors";
  return <section aria-labelledby="hof-eligibility-title" className="space-y-3">
    <h4 id="hof-eligibility-title" className="text-sm font-semibold">승률 등재 기준</h4>
    <div className="rounded-xl border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="eligibility_game_threshold">기준 전환점</Label>
        <div className="flex items-center gap-2"><Input id="eligibility_game_threshold" name="eligibility_game_threshold" type="number" min={1} max={5000} required value={threshold} className="h-8 w-24 text-right tabular-nums" onChange={(e) => setThreshold(e.target.value)} onBlur={() => setThreshold(String(cutoff))} /><span className="text-xs text-muted-foreground">경기</span></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={cn(branch, proportional ? "border-primary/50 bg-primary/5" : "bg-background/40")}>
          <div className="text-xs text-muted-foreground">{cutoff.toLocaleString()}경기까지</div>
          <Label htmlFor="eligibility_below_pct" className="text-xs font-semibold">전체 경기의</Label>
          <div className="flex items-center gap-1.5"><Input id="eligibility_below_pct" name="eligibility_below_pct" type="number" min={1} max={100} required value={percentage} className="h-9 min-w-0 text-lg font-bold tabular-nums" onChange={(e) => setPercentage(e.target.value)} onBlur={() => setPercentage(String(rules.eligibilityBelowPct))} /><span className="text-sm">%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${rules.eligibilityBelowPct}%` }} /></div>
        </div>
        <div className={cn(branch, !proportional ? "border-primary/50 bg-primary/5" : "bg-background/40")}>
          <div className="text-xs text-muted-foreground">{(cutoff + 1).toLocaleString()}경기부터</div>
          <Label htmlFor="eligibility_above_min_games" className="text-xs font-semibold">출전 횟수</Label>
          <div className="flex items-center gap-1.5"><Input id="eligibility_above_min_games" name="eligibility_above_min_games" type="number" min={1} max={2000} required value={minimum} className="h-9 min-w-0 text-lg font-bold tabular-nums" onChange={(e) => setMinimum(e.target.value)} onBlur={() => setMinimum(String(rules.eligibilityAboveMinGames))} /><span className="shrink-0 text-sm">경기</span></div>
          <div className="text-[10px] text-muted-foreground">경기 수가 늘어도 고정</div>
        </div>
      </div>
    </div>
    <ChevronDown className="mx-auto size-4 text-muted-foreground" aria-hidden="true" />
    <div className="space-y-3 rounded-xl border p-3" aria-label="승률 등재 미리보기">
      <div className="flex items-center justify-between gap-3"><h5 className="text-xs font-semibold">직접 움직여 보기</h5><span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">저장되는 값 아님</span></div>
      <div className="space-y-2">
        <label htmlFor="hof-preview-games" className="flex items-center justify-between gap-3 text-xs"><span>클랜 전체 경기</span><strong className="tabular-nums">{games.toLocaleString()}경기</strong></label>
        <input id="hof-preview-games" aria-label="클랜 전체 경기" type="range" min={0} max={maximum} step={1} value={games} onChange={(e) => setGames(Number(e.target.value))} className="block w-full accent-primary" />
        <div className="flex flex-wrap gap-1.5">{[cutoff, cutoff + 1].map((value) => <button key={value} type="button" aria-pressed={games === value} className="rounded-md border px-2 py-1 text-[10px] hover:bg-muted aria-pressed:border-primary aria-pressed:text-primary" onClick={() => setGames(value)}>{value.toLocaleString()}경기</button>)}</div>
      </div>
      <output className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-xs" aria-live="polite"><span>필요 출전</span><strong className="text-lg tabular-nums text-primary">{required.toLocaleString()}<span className="ml-1 text-xs">경기</span></strong></output>
      <div className="space-y-2">
        <label htmlFor="hof-preview-played" className="flex items-center justify-between gap-3 text-xs"><span>멤버 출전</span><strong className="tabular-nums">{appearances.toLocaleString()}경기</strong></label>
        <input id="hof-preview-played" aria-label="멤버 출전" type="range" min={0} max={games} step={1} value={appearances} onChange={(e) => setPlayed(Number(e.target.value))} className="block w-full accent-primary" disabled={!games} />
        <div className="flex items-center justify-between gap-2 text-xs" role="status" aria-label="출전 기준 확인"><span className={cn("flex items-center gap-1.5 font-semibold", qualifies ? "text-primary" : "text-muted-foreground")}>{qualifies && <Check className="size-3.5" aria-hidden="true" />}{!games ? "기록 없음" : qualifies ? "등재 가능" : "규정 미달"}</span><span className="tabular-nums text-muted-foreground">{games && !qualifies ? `${required - appearances}경기 더 출전` : `${appearances} / ${required}경기`}</span></div>
      </div>
    </div>
  </section>;
}
