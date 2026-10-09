"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minGamesToQualify, minSessionsToQualify, resolveHofConfig, type ResolvedHofConfig } from "@/lib/clan/stats/hof-config";
import { cn } from "@/lib/utils";
import { StatHelp } from "./stat-help";

export function useHofEligibilityDraft(cfg: ResolvedHofConfig) {
  const [threshold, setThreshold] = useState(String(cfg.eligibilityGameThreshold));
  const [percentage, setPercentage] = useState(String(cfg.eligibilityBelowPct));
  const [minimum, setMinimum] = useState(String(cfg.eligibilityAboveMinGames));
  const [sessionPct, setSessionPct] = useState(String(cfg.eligibilitySessionPct));
  const rules = resolveHofConfig({ eligibility_game_threshold: Number(threshold), eligibility_below_pct: Number(percentage), eligibility_above_min_games: Number(minimum), eligibility_session_pct: Number(sessionPct) });
  return { threshold, setThreshold, percentage, setPercentage, minimum, setMinimum, sessionPct, setSessionPct, rules };
}
type EligibilityDraft = ReturnType<typeof useHofEligibilityDraft>;

export function HofEligibilitySettings({ draft }: { draft: EligibilityDraft }) {
  const { threshold, setThreshold, percentage, setPercentage, minimum, setMinimum, sessionPct, setSessionPct, rules } = draft;
  const cutoff = rules.eligibilityGameThreshold;
  return <section aria-labelledby="hof-eligibility-title" className="space-y-4">
    <div className="flex items-center gap-3">
      <h4 id="hof-eligibility-title" className="text-sm font-semibold">순위 등재 기준</h4>
      <StatHelp title="순위 등재 기준"><div className="space-y-2">
        <p>클랜마다 내전을 여는 횟수와 한 번에 진행하는 경기 수가 다릅니다. 경기 수가 갑자기 늘거나 새벽까지 이어져도 꾸준히 참여한 멤버의 요구 출전 수가 계속 높아지지 않도록 구분합니다.</p>
        <p>승률은 경기 수가 적을 때 출전 비율을, 전환점을 넘으면 고정 출전 수를 적용합니다. 기본 설정에서는 30경기 이상 출전하면 최소 요구 경기를 충족합니다.</p>
        <p>내전 참여는 같은 내전에서 여러 경기에 출전해도 1회입니다. 전체 정규 내전 중 참여 비율만 적용하며, 고정 횟수 기준은 적용하지 않습니다.</p>
      </div></StatHelp>
    </div>
    <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
      <h5 className="text-xs font-semibold">경기 출전 · 승률 순위</h5>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="eligibility_game_threshold">기준 전환점</Label>
        <div className="flex items-center gap-2"><Input id="eligibility_game_threshold" name="eligibility_game_threshold" type="number" min={1} max={5000} required value={threshold} className="h-8 w-24 text-right tabular-nums" onChange={(e) => setThreshold(e.target.value)} onBlur={() => setThreshold(String(cutoff))} /><span className="text-xs text-muted-foreground">경기</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2 rounded-xl border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">{cutoff.toLocaleString()}경기까지</div>
          <Label htmlFor="eligibility_below_pct" className="text-xs font-semibold">전체 경기의</Label>
          <div className="flex items-center gap-1.5"><Input id="eligibility_below_pct" name="eligibility_below_pct" type="number" min={1} max={100} required value={percentage} className="h-9 min-w-0 text-lg font-bold tabular-nums" onChange={(e) => setPercentage(e.target.value)} onBlur={() => setPercentage(String(rules.eligibilityBelowPct))} /><span className="shrink-0 text-sm">%</span></div>
        </div>
        <div className="min-w-0 space-y-2 rounded-xl border bg-background/40 p-3">
          <div className="text-xs text-muted-foreground">{(cutoff + 1).toLocaleString()}경기부터</div>
          <Label htmlFor="eligibility_above_min_games" className="text-xs font-semibold">출전 횟수</Label>
          <div className="flex items-center gap-1.5"><Input id="eligibility_above_min_games" name="eligibility_above_min_games" type="number" min={1} max={2000} required value={minimum} className="h-9 min-w-0 text-lg font-bold tabular-nums" onChange={(e) => setMinimum(e.target.value)} onBlur={() => setMinimum(String(rules.eligibilityAboveMinGames))} /><span className="shrink-0 text-sm">경기</span></div>
          <div className="text-[10px] text-muted-foreground">경기 수가 늘어도 고정</div>
        </div>
      </div>
    </div>
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <h5 className="text-xs font-semibold">내전 참여 · 참여 순위</h5>
      <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="eligibility_session_pct">전체 정규 내전의</Label><div className="flex items-center gap-2"><Input id="eligibility_session_pct" name="eligibility_session_pct" type="number" min={1} max={100} required value={sessionPct} className="h-9 w-24 text-right font-bold tabular-nums" onChange={(e) => setSessionPct(e.target.value)} onBlur={() => setSessionPct(String(rules.eligibilitySessionPct))} /><span className="text-xs">% 이상 참여</span></div></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{ width: `${rules.eligibilitySessionPct}%` }} /></div>
      <p className="text-[11px] text-muted-foreground">내전 1회당 참여 1회 · 고정 횟수 기준 없음</p>
    </div>
  </section>;
}

export function HofEligibilityPreview({ draft, totalGames = 100, totalSessions = 20 }: { draft: EligibilityDraft; totalGames?: number; totalSessions?: number }) {
  const [kind, setKind] = useState<"games" | "sessions">("games");
  const [games, setGames] = useState(Math.min(200, totalGames));
  const [played, setPlayed] = useState(Math.min(10, totalGames));
  const [sessions, setSessions] = useState(Math.min(200, totalSessions));
  const [attended, setAttended] = useState(Math.min(5, totalSessions));
  const isGames = kind === "games", total = isGames ? games : sessions;
  const required = isGames ? minGamesToQualify(total, draft.rules) : minSessionsToQualify(total, draft.rules);
  const appearances = Math.min(isGames ? played : attended, total);
  const qualifies = total > 0 && appearances >= required;
  const unit = isGames ? "경기" : "회";
  const totalLabel = isGames ? "클랜 전체 경기" : "클랜 전체 내전";
  const playedLabel = isGames ? "멤버 출전" : "멤버 참여";
  return <section aria-label="순위 등재 미리보기" className="overflow-hidden rounded-2xl border bg-background shadow-xl">
    <div className="flex items-start justify-between gap-3 border-b p-5"><div><h4 className="text-base font-semibold">순위 등재 미리보기</h4><p className="mt-1 text-xs text-muted-foreground">예시 기록 · 설정에 따라 결과가 바뀝니다.</p></div><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">미리보기</span></div>
    <div className="space-y-6 p-5">
      <div role="group" aria-label="미리보기 대상" className="grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1">{([['games', '경기 출전'], ['sessions', '내전 참여']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className="rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground">{label}</button>)}</div>
      <div className="space-y-3">
        <label htmlFor="hof-preview-total" className="flex items-center justify-between gap-3 text-xs"><span>{totalLabel}</span><strong className="text-lg tabular-nums">{total.toLocaleString()}{unit}</strong></label>
        <input id="hof-preview-total" aria-label={totalLabel} type="range" min={0} max={200} step={1} value={total} onChange={(e) => (isGames ? setGames : setSessions)(Number(e.target.value))} className="block w-full accent-primary" />
        <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground"><span>0{unit}</span><span>200{unit}</span></div>
      </div>
      <output className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 p-4 text-xs" aria-live="polite"><span>{isGames ? "순위 등재 최소 요구 경기" : "순위 등재 최소 요구 내전"}</span><strong className="text-2xl tabular-nums text-primary">{required.toLocaleString()}<span className="ml-1 text-xs">{unit}</span></strong></output>
      <div className="space-y-3">
        <label htmlFor="hof-preview-played" className="flex items-center justify-between gap-3 text-xs"><span>{playedLabel}</span><strong className="text-lg tabular-nums">{appearances.toLocaleString()}{unit}</strong></label>
        <input id="hof-preview-played" aria-label={playedLabel} type="range" min={0} max={total} step={1} value={appearances} onChange={(e) => (isGames ? setPlayed : setAttended)(Number(e.target.value))} className="block w-full accent-primary" disabled={!total} />
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className={cn("h-full rounded-full transition-[width]", qualifies ? "bg-primary" : "bg-muted-foreground/40")} style={{ width: `${required ? Math.min(100, appearances / required * 100) : 0}%` }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs" role="status" aria-label="출전 기준 확인"><span className={cn("flex items-center gap-1.5 font-semibold", qualifies ? "text-primary" : "text-muted-foreground")}>{qualifies && <Check className="size-3.5" aria-hidden="true" />}{!total ? "기록 없음" : qualifies ? "순위 등재 가능" : "규정 미달"}</span><span className="tabular-nums text-muted-foreground">{total && !qualifies ? `${required - appearances}${unit} 더 ${isGames ? "출전" : "참여"}` : `${appearances} / ${required}${unit}`}</span></div>
      </div>
    </div>
    <p className="border-t px-5 py-3 text-[10px] text-muted-foreground">미리보기에서 움직인 경기·내전·멤버 기록은 저장되지 않습니다.</p>
  </section>;
}
