"use client";

import { useTranslator } from "#use-translator";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveHofConfig, type ResolvedHofConfig } from "@/lib/clan/stats/hof-config";
import { StatHelp } from "./stat-help";

export function HofEligibilitySettings({ cfg }: { cfg: ResolvedHofConfig }) {
  const tx = useTranslator();
  const [threshold, setThreshold] = useState(String(cfg.eligibilityGameThreshold));
  const [percentage, setPercentage] = useState(String(cfg.eligibilityBelowPct));
  const [minimum, setMinimum] = useState(String(cfg.eligibilityAboveMinGames));
  const [sessionPct, setSessionPct] = useState(String(cfg.eligibilitySessionPct));
  const rules = resolveHofConfig({ eligibility_game_threshold: Number(threshold), eligibility_below_pct: Number(percentage), eligibility_above_min_games: Number(minimum), eligibility_session_pct: Number(sessionPct) });
  const cutoff = rules.eligibilityGameThreshold;
  return <section aria-labelledby="hof-eligibility-title" className="space-y-4">
    <h4 id="hof-eligibility-title" className="text-sm font-semibold">
      <StatHelp title={tx("순위 등재 기준")}><div className="space-y-2">
        <p>{tx("클랜마다 내전을 여는 횟수와 한 번에 진행하는 경기 수가 다릅니다. 경기 수가 갑자기 늘거나 새벽까지 이어져도 꾸준히 참여한 멤버의 요구 출전 수가 계속 높아지지 않도록 구분합니다.")}</p>
        <p>{tx("승률은 경기 수가 적을 때 출전 비율을, 전환점을 넘으면 고정 출전 수를 적용합니다. 기본 설정에서는 30경기 이상 출전하면 최소 요구 경기를 충족합니다.")}</p>
        <p>{tx("내전 참여는 같은 내전에서 여러 경기에 출전해도 1회입니다. 전체 정규 내전 중 참여 비율만 적용하며, 고정 횟수 기준은 적용하지 않습니다.")}</p>
      </div></StatHelp>
    </h4>
    <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
      <h5 className="text-xs font-semibold">{tx("경기 출전 · 승률 순위")}</h5>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="eligibility_game_threshold">{tx("기준 전환점")}</Label>
        <div className="flex items-center gap-2"><Input id="eligibility_game_threshold" name="eligibility_game_threshold" type="number" min={1} max={5000} required value={threshold} className="h-8 w-24 text-right tabular-nums" onChange={(e) => setThreshold(e.target.value)} onBlur={() => setThreshold(String(cutoff))} /><span className="text-xs text-muted-foreground">{tx("경기")}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2 rounded-xl border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">{cutoff.toLocaleString()}{tx("경기까지")}</div>
          <Label htmlFor="eligibility_below_pct" className="text-xs font-semibold">{tx("전체 경기의")}</Label>
          <div className="flex items-center gap-1.5"><Input id="eligibility_below_pct" name="eligibility_below_pct" type="number" min={1} max={100} required value={percentage} className="h-9 min-w-0 text-lg font-bold tabular-nums" onChange={(e) => setPercentage(e.target.value)} onBlur={() => setPercentage(String(rules.eligibilityBelowPct))} /><span className="shrink-0 text-sm">%</span></div>
        </div>
        <div className="min-w-0 space-y-2 rounded-xl border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">{(cutoff + 1).toLocaleString()}{tx("경기부터")}</div>
          <Label htmlFor="eligibility_above_min_games" className="text-xs font-semibold">{tx("출전 횟수")}</Label>
          <div className="flex items-center gap-1.5"><Input id="eligibility_above_min_games" name="eligibility_above_min_games" type="number" min={1} max={2000} required value={minimum} className="h-9 min-w-0 text-lg font-bold tabular-nums" onChange={(e) => setMinimum(e.target.value)} onBlur={() => setMinimum(String(rules.eligibilityAboveMinGames))} /><span className="shrink-0 text-sm">{tx("경기")}</span></div>
          <div className="text-[10px] text-muted-foreground">{tx("경기 수가 늘어도 고정")}</div>
        </div>
      </div>
    </div>
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <h5 className="text-xs font-semibold">{tx("내전 참여 · 참여 순위")}</h5>
      <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="eligibility_session_pct">{tx("전체 정규 내전의")}</Label><div className="flex items-center gap-2"><Input id="eligibility_session_pct" name="eligibility_session_pct" type="number" min={1} max={100} required value={sessionPct} className="h-9 w-24 text-right font-bold tabular-nums" onChange={(e) => setSessionPct(e.target.value)} onBlur={() => setSessionPct(String(rules.eligibilitySessionPct))} /><span className="text-xs">{tx("% 이상 참여")}</span></div></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${rules.eligibilitySessionPct}%` }} /></div>
      <p className="text-[11px] text-muted-foreground">{tx("내전 1회당 참여 1회 · 고정 횟수 기준 없음")}</p>
    </div>
  </section>;
}
