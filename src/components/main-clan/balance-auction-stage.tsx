"use client";

import { useState } from "react";
import { Check, Crown, Gavel, Gift, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, TEAM_LABEL, canFit, maxBid, type FormationCommand, type FormationState, type Team } from "@/lib/balance/formation";

const teams = ["team1", "team2"] as const;
const teamColor = (team: Team) => team === "team1" ? "text-sky-400" : "text-rose-400";

function Countdown({ deadline, startedAt, now, paused }: { deadline: number; startedAt: number; now: number; paused: boolean }) {
  const remaining = Math.max(0, deadline - now);
  const seconds = Math.ceil(remaining / 1000);
  const ratio = Math.min(1, remaining / Math.max(1, deadline - startedAt));
  return <div className="space-y-3" data-testid="auction-countdown">
    <div className={cn("flex items-center justify-center gap-2 font-bold tabular-nums", seconds <= 5 && !paused ? "text-amber-400" : "text-muted-foreground")}>
      <Timer className={cn("size-5", seconds <= 5 && !paused && "motion-safe:animate-pulse")} aria-hidden="true" />
      <span className="text-3xl">{seconds}<span className="ml-1 text-xs font-medium">초</span></span>
      {paused ? <span className="text-xs">일시정지</span> : null}
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
      <div className={cn("h-full origin-left rounded-full transition-[width] duration-200 motion-reduce:transition-none", seconds <= 5 ? "bg-amber-400" : "bg-primary")} style={{ width: `${ratio * 100}%` }} />
    </div>
  </div>;
}

export function AuctionPurchases({ state }: { state: FormationState | null }) {
  if (!state?.strategy || !state.itemChoices || !teams.some((team) => state.itemChoices?.[team])) return null;
  return <aside className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4" aria-label="구매한 전략 아이템">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><Gift className="size-4 text-amber-400" aria-hidden="true" />구매한 전략 아이템</h4>
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map((team) => {
        const item = state.strategy!.items.find((candidate) => candidate.id === state.itemChoices?.[team]);
        return item ? <div key={team} className="min-w-0 space-y-1 text-xs"><strong className={teamColor(team)}>{TEAM_LABEL[team]} · {item.name}</strong><p className="break-words text-muted-foreground">{item.description || "등록된 효과를 적용해 주세요."}</p></div> : null;
      })}
    </div>
    <p className="text-[11px] text-muted-foreground">아이템 효과는 운영진이 경기 규칙에 직접 적용합니다.</p>
  </aside>;
}

export function BalanceAuctionStage({ state, now, pending, revealing, name, canTeam, run }: {
  state: FormationState; now: number; pending: boolean; revealing: boolean;
  name: (id: string) => string; canTeam: (team: Team) => boolean; run: (command: FormationCommand) => void;
}) {
  const [bidDraft, setBidDraft] = useState({ lot: "", value: 0 });
  const lot = state.auction;
  const increment = state.settings?.minBid ?? 10;
  const minimum = (lot?.bid ?? 0) + increment;
  const lotKey = `${lot?.player}:${lot?.startedAt}`;
  const amount = Math.max(minimum, bidDraft.lot === lotKey ? bidDraft.value : minimum);
  const frozen = state.pausedAt !== null;
  const clock = state.pausedAt ?? now;
  const award = state.award;
  const actionable = !pending && !revealing && !frozen;
  const controlledTeams = teams.filter(canTeam);
  const itemStage = state.stage === "items";
  const strategyStage = state.stage === "strategy";
  const stages = state.strategy ? ["아이템 공개", "팀원 경매", "아이템 선택", "편성 완료"] : ["팀원 경매", "편성 완료"];
  const step = strategyStage ? 0 : itemStage ? 2 : state.stage === "complete" ? stages.length - 1 : state.strategy ? 1 : 0;

  return <div className="space-y-4" data-testid="auction-stage" data-auction-stage={state.stage}>
    <ol className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs" aria-label="경매 진행 단계">
      {stages.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={cn("flex items-center gap-1.5", step === index ? "font-semibold text-foreground" : "text-muted-foreground")}><span className={cn("flex size-5 items-center justify-center rounded-full text-[10px]", index <= step ? "bg-primary/15 text-primary" : "bg-muted")}>{index < step ? <Check className="size-3" /> : index + 1}</span>{label}</li>)}
    </ol>
    <div className="grid grid-cols-2 gap-3">
      {teams.map((team, index) => <div key={team} className={cn("min-w-0 rounded-xl border px-4 py-3", team === "team1" ? "border-sky-500/25 bg-sky-500/5" : "border-rose-500/25 bg-rose-500/5 text-right")}>
        <p className={cn("text-xs font-semibold", teamColor(team))}>{TEAM_LABEL[team]} <span className="font-normal text-muted-foreground">남은 포인트</span></p>
        <p className="my-1 text-2xl font-black tabular-nums">{state.budgets[team].toLocaleString()}<span className="ml-1 text-xs font-medium text-muted-foreground">pt</span></p>
        <p className="truncate text-xs text-muted-foreground"><Crown className="mr-1 inline size-3" aria-hidden="true" />{state.captains ? name(state.captains[index]) : "주장"}</p>
      </div>)}
    </div>

    {revealing ? <div className="rounded-xl border bg-muted/10 p-6 text-center text-sm text-muted-foreground">역할 공개가 끝나면 경매가 자동으로 시작됩니다.</div> : strategyStage && state.strategy ? <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">전략 준비</p>
      <h4 className="text-xl font-bold">이번 경매의 전략 아이템</h4>
      <p className="text-xs leading-relaxed text-muted-foreground">선수 영입 후 남은 포인트로 팀당 아이템 하나를 구매할 수 있습니다.<br />아이템 가격을 확인하고 영입 예산을 계획하세요.</p>
      <Countdown deadline={state.strategy.deadline} startedAt={state.strategy.startedAt} now={clock} paused={frozen} />
    </div> : award ? <div key={`${award.player}:${award.startedAt}`} role="status" data-testid="auction-award" data-player-id={award.player} className={cn("space-y-3 rounded-xl border p-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500", award.team === "team1" ? "border-sky-400/50 bg-sky-500/10" : "border-rose-400/50 bg-rose-500/10")}>
      <Gavel className={cn("mx-auto size-8", teamColor(award.team))} aria-hidden="true" />
      <p className={cn("text-sm font-bold", teamColor(award.team))}>{TEAM_LABEL[award.team]} {award.fallback ? "자동 배정" : "낙찰"}</p>
      <h4 className="break-words text-3xl font-black">{name(award.player)}</h4>
      <p className="text-xl font-bold tabular-nums">{award.amount.toLocaleString()}<span className="ml-1 text-xs">pt</span></p>
      <p className="text-xs text-muted-foreground">{state.remaining.length ? "곧 다음 선수를 공개합니다." : state.strategy ? "곧 아이템을 선택합니다." : "팀 편성을 마무리합니다."}</p>
    </div> : lot ? <div className="relative overflow-hidden rounded-xl border bg-background/40 p-4 text-center sm:p-6" data-testid="auction-player" data-player-id={lot.player}>
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-xs font-semibold text-muted-foreground">{lot.retry ? "재경매" : "현재 경매 선수"} · {ROLE_LABEL[state.players.find((player) => player.id === lot.player)!.role]} · {9 - state.remaining.length} / 8</p>
        <h4 key={lot.player} className="break-words text-3xl font-black sm:text-4xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">{name(lot.player)}</h4>
        <div className={cn("space-y-1 rounded-xl py-3", lot.team === "team1" ? "bg-sky-500/10" : lot.team === "team2" ? "bg-rose-500/10" : "bg-muted/30")}>
          <p className={cn("text-xs font-semibold", lot.team ? teamColor(lot.team) : "text-muted-foreground")}>{lot.team ? `${TEAM_LABEL[lot.team]} 최고 입찰` : "첫 입찰을 기다립니다"}</p>
          <p className="text-3xl font-black tabular-nums">{lot.bid.toLocaleString()}<span className="ml-1 text-sm font-medium">pt</span></p>
        </div>
        <Countdown deadline={lot.deadline} startedAt={lot.startedAt} now={clock} paused={frozen} />
        {controlledTeams.length ? <div className="space-y-3 pt-2">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <div className="grid gap-1 min-[480px]:grid-cols-2">{[-10 * increment, -increment].map((delta) => <Button key={delta} size="sm" variant="outline" className="px-2 tabular-nums" disabled={!actionable || clock >= lot.deadline || amount <= minimum} onClick={() => setBidDraft({ lot: lotKey, value: Math.max(minimum, amount + delta) })}>{delta}</Button>)}</div>
            <label className="min-w-0"><span className="sr-only">입찰 포인트</span><input inputMode="numeric" pattern="[0-9]*" aria-label="입찰 포인트" className="h-10 w-full min-w-0 rounded-lg border bg-background px-1 text-center text-base font-bold tabular-nums" disabled={!actionable || clock >= lot.deadline} value={amount} onChange={(event) => { if (/^\d*$/.test(event.target.value)) setBidDraft({ lot: lotKey, value: Math.min(100000, Number(event.target.value)) }); }} /></label>
            <div className="grid gap-1 min-[480px]:grid-cols-2">{[10 * increment, increment].map((delta) => <Button key={delta} size="sm" variant="outline" className="px-2 tabular-nums" disabled={!actionable || clock >= lot.deadline || amount + delta > 100000} onClick={() => setBidDraft({ lot: lotKey, value: amount + delta })}>+{delta}</Button>)}</div>
          </div>
          <div className="flex gap-2">{controlledTeams.map((team) => <Button key={team} className="min-w-0 flex-1" disabled={!actionable || clock >= lot.deadline || !canFit(state, team, lot.player) || amount % increment !== 0 || maxBid(state, team) < amount} onClick={() => run({ type: "bid", team, amount })}>{TEAM_LABEL[team]} 입찰 · {amount.toLocaleString()}pt</Button>)}</div>
          <p className="text-[11px] text-muted-foreground">{increment}pt 단위 · 남은 선수의 최소 영입 비용은 자동으로 남겨 둡니다.</p>
        </div> : <p className="text-xs text-muted-foreground">양 팀 주장이 입찰하고 있습니다.</p>}
      </div>
    </div> : itemStage ? <div className="space-y-2 text-center"><h4 className="text-xl font-bold">남은 포인트로 전략을 완성하세요</h4><p className="text-xs text-muted-foreground">팀당 최대 1개 · 같은 아이템을 양 팀 모두 구매할 수 있습니다.</p></div> : <p role="status" className="p-4 text-center text-sm text-muted-foreground">다음 경매를 준비하고 있습니다.</p>}

    {state.strategy && !revealing ? <div className="grid gap-3 sm:grid-cols-3" aria-label="이번 경매 아이템">
      {state.strategy.items.map((item) => <div key={item.id} className={cn("flex min-w-0 flex-col gap-3 rounded-xl border p-4", strategyStage || itemStage ? "border-amber-500/25 bg-amber-500/5" : "bg-muted/10")}>
        <div className="flex items-center justify-between gap-2"><Gift className="size-4 shrink-0 text-amber-400" aria-hidden="true" /><strong className="text-sm tabular-nums text-amber-400">{item.cost.toLocaleString()}pt</strong></div>
        <h5 className="break-words text-sm font-semibold">{item.name}</h5>
        <p className="flex-1 break-words text-xs leading-relaxed text-muted-foreground">{item.description || "운영진이 경기 규칙에 직접 적용합니다."}</p>
        {itemStage ? controlledTeams.map((team) => {
          const choice = state.itemChoices?.[team];
          return <Button key={team} variant={choice === item.id ? "secondary" : "outline"} size="sm" disabled={!actionable || choice !== undefined || state.budgets[team] < item.cost} onClick={() => run({ type: "choose-item", team, itemId: item.id })}>{choice === item.id ? `${TEAM_LABEL[team]} 구매 완료` : state.budgets[team] < item.cost ? `${TEAM_LABEL[team]} 포인트 부족` : `${TEAM_LABEL[team]} 구매`}</Button>;
        }) : null}
      </div>)}
    </div> : null}
    {itemStage ? <div className="grid gap-3 sm:grid-cols-2">{teams.map((team) => {
      const choice = state.itemChoices?.[team];
      const item = state.strategy?.items.find((candidate) => candidate.id === choice);
      return <div key={team} className="space-y-2 rounded-lg bg-muted/20 p-3 text-center text-xs"><p className={cn("font-semibold", teamColor(team))}>{TEAM_LABEL[team]} · {item ? item.name : choice === null ? "구매 안 함" : "선택 중"}</p>{canTeam(team) && choice === undefined ? <Button size="sm" variant="ghost" disabled={!actionable} onClick={() => run({ type: "choose-item", team, itemId: null })}>{TEAM_LABEL[team]} 구매 없이 완료</Button> : null}</div>;
    })}</div> : null}
  </div>;
}
