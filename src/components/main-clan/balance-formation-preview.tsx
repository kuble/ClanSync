"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Crown, Pause, Play, RotateCcw, Shield, Cross, Swords, MousePointer2 } from "lucide-react";
import type { FormationSettings, Role } from "@/lib/balance/formation";
import { cn } from "@/lib/utils";
import styles from "./balance-formation-preview.module.css";
import { AUTO_DRAW_ORDER, AUTO_DRAW_TEAMS, BalanceAutoDrawPreview, type AutoDrawScene } from "./balance-auto-draw-preview";

const players: { name: string; role: Role }[] = [
  { name: "새벽", role: "tank" }, { name: "구름", role: "tank" },
  { name: "네온", role: "dmg" }, { name: "에임", role: "dmg" },
  { name: "달빛", role: "dmg" }, { name: "바람", role: "dmg" },
  { name: "모찌", role: "sup" }, { name: "루나", role: "sup" },
  { name: "여우", role: "sup" }, { name: "감자", role: "sup" },
];
const roleIcons = { tank: Shield, dmg: Swords, sup: Cross };
const roleNames = { tank: "돌격", dmg: "공격", sup: "지원" };
type PreviewStep = {
  title: string;
  text: string;
  teams: (number | null)[];
  active: number[];
  rolesKnown: number;
  credits: number[];
  durationMs?: number;
  autoDraw?: AutoDrawScene;
  auction?: {
    player: number;
    seconds: number;
    leader: number | null;
    amount: number;
    nextBid: number;
    notice: string;
    myAction?: boolean;
    extended?: boolean;
  };
};
function buildSteps(settings: FormationSettings): PreviewStep[] {
  const teams: (number | null)[] = players.map((_, index) => settings.teams === "keep" ? index % 2 : null);
  const budget = Number.isFinite(settings.auctionBudget) ? Math.max(40, settings.auctionBudget) : 1000;
  const bid = Number.isFinite(settings.minBid) ? Math.max(1, Math.min(settings.minBid, Math.floor(budget / 6))) : 10;
  const price = Math.min(bid * 2, budget - bid * 3);
  const seconds = Number.isFinite(settings.durationSeconds) ? Math.max(10, Math.min(60, settings.durationSeconds)) : 20;
  const credits = [budget, budget];
  const steps: PreviewStep[] = [];
  const add = (title: string, text: string, active: number[] = [], extra: Partial<PreviewStep> = {}) => {
    steps.push({ title, text, active, teams: [...teams], credits: [...credits], rolesKnown: 10, ...extra });
  };
  if (settings.roles === "lottery" && settings.teams === "random") {
    add("내 선호 역할 선택", "여우의 화면입니다. 이번 라운드에 원하는 역할의 순위를 먼저 정해요.", [], { rolesKnown: 0, autoDraw: { kind: "preference" } });
    add("지원 1순위로 변경", "두 역할을 선택해 순서를 바꾸면 이번 라운드의 선호가 저장돼요.", [], { rolesKnown: 0, autoDraw: { kind: "preference", preferenceChanged: true } });
    add("편성 화면으로 전환", "명단의 10명이 준비되면 운영진이 추첨을 시작해요. 선호는 본인만 볼 수 있어요.", [], { rolesKnown: 0, autoDraw: { kind: "roster" } });
    add("추첨 발표 화면으로 전환", "공통 순서를 추첨하고, 각 선수의 선호와 남은 역할 자리에 따라 배정해요.", [], { durationMs: 1000, rolesKnown: 0, autoDraw: { kind: "draw", revealed: 0 } });
    AUTO_DRAW_ORDER.forEach((index, order) => {
      teams[index] = AUTO_DRAW_TEAMS[index];
      add(`${order + 1}번째 발표 · ${players[index].name}`, index === 8
        ? "여우는 선호한 지원에 배정되고, 역할별 팀 추첨으로 2팀에 합류해요."
        : `${players[index].name}의 역할은 ${roleNames[players[index].role]}, 팀은 ${teams[index] === 0 ? "1" : "2"}팀! 확정된 자리는 남고 다음 선수를 공개해요.`, [index],
      { durationMs: 800, autoDraw: { kind: "draw", revealed: order + 1 } });
    });
    add("팀 구성 완료", "각 팀에 돌격 1 · 공격 2 · 지원 2명. 여우는 2팀 지원으로 배정됐어요.", [], { durationMs: 3200, autoDraw: { kind: "complete", revealed: 10 } });
    return steps;
  }
  if (settings.roles === "lottery") {
    add("선호 역할 확인", "자동 배정은 각 선수의 선호 역할과 남은 자리를 확인해요.", [], { rolesKnown: 0 });
    add("공통 순서 추첨", "모든 선수가 같은 추첨 순서로 역할을 배정받아요.", [0, 1], { rolesKnown: 0 });
    add("돌격 자리 배정", "예시의 새벽·구름은 선호와 남은 자리에 따라 돌격에 배정돼요.", [0, 1], { rolesKnown: 2 });
    add("공격 자리 배정", "순서대로 선호를 확인하며 남은 공격 4자리를 채워요.", [2, 3, 4, 5], { rolesKnown: 6 });
    add("지원 자리 배정", "지원 4자리까지 채운 뒤 이 역할을 유지하며 팀을 나눠요.", [6, 7, 8, 9]);
  } else {
    add(settings.teams === "auction" ? "A팀 주장 시점" : "수동 명단 확인", settings.teams === "auction"
      ? "A팀 주장 시점으로 보여드릴게요. 내 팀 크레딧을 보며 상대 팀과 입찰 경쟁을 해요."
      : "수동 배정은 명단에서 정한 역할을 그대로 사용해요.");
    add("역할 인원 확인", "돌격 2명 · 공격 4명 · 지원 4명인지 확인해요.", players.map((_, i) => i));
  }
  if (settings.teams === "keep") {
    add("현재 팀 유지", "배치한 팀과 역할을 그대로 사용하고 다음 단계로 넘어가요.");
  } else if (settings.teams === "random") {
    add("역할별로 모으기", "돌격·공격·지원 각각의 선수 안에서 팀을 추첨해요.");
    for (const [indices, title, text] of [
      [[0, 1], "돌격 팀 추첨", "돌격 2명을 한 명씩 A팀과 B팀에 배치해요."],
      [[2, 3], "첫 공격 자리 추첨", "공격 선수 두 명을 양 팀의 첫 공격 자리에 배치해요."],
      [[4, 5], "두 번째 공격 자리 추첨", "남은 공격 두 명도 나눠 각 팀 공격 2명을 맞춰요."],
      [[6, 7], "첫 지원 자리 추첨", "지원 두 명을 양 팀의 첫 지원 자리에 배치해요."],
      [[8, 9], "두 번째 지원 자리 추첨", "남은 지원 두 명을 나눠 팀 구성을 완성해요."],
    ] as const) {
      for (const index of indices) teams[index] = index % 2;
      add(title, text, [...indices]);
    }
    add("팀 구성 완료", "각 팀에 돌격 1 · 공격 2 · 지원 2명! 역할 정원을 유지해요.");
  } else {
    teams[0] = 0; teams[1] = 1;
    add("양 팀 주장 배치", settings.roles === "lottery"
      ? "자동 배정으로 돌격이 된 두 선수가 양 팀 주장을 맡아요."
      : "예시는 양 팀 돌격이 주장입니다. 수동 배정에서는 같은 역할의 두 선수를 지정할 수 있어요.", [0, 1]);
    if (settings.teams === "draft") {
      add("선픽 팀 추첨", "먼저 고를 팀을 추첨해요. 이 예시에서는 A팀이 선픽입니다.");
      const order = [0, 1, 1, 0, 0, 1, 1, 0];
      order.forEach((team, pick) => {
        const index = pick + 2;
        teams[index] = team;
        add(`${pick + 1}번째 지명 · ${team === 0 ? "A" : "B"}팀`,
          `${team === 0 ? "A" : "B"}팀이 ${players[index].name}(${roleNames[players[index].role]})를 지명해요. ${pick === 2 || pick === 4 || pick === 6 ? "같은 팀이 연속으로 고르는 차례예요." : "A → B → B → A 순서로 번갈아 진행해요."}`, [index]);
      });
    } else {
      if (settings.auctionItemsEnabled) {
        add("전략 아이템 공개", "등록된 활성 아이템 중 3개를 먼저 무작위로 공개해요.");
        add("전략 준비", `${settings.strategySeconds}초 동안 팀 전략을 준비한 뒤 선수 경매를 시작해요.`);
      }
      for (const [index, desiredWinner] of [[2, 0], [3, 1]] as const) {
        const raised = price > bid;
        const winningPrice = desiredWinner === 0 ? Math.min(bid * 3, budget - bid * 3) : price;
        const counterBid = desiredWinner === 0 && winningPrice > price;
        const winner = counterBid || !raised ? 0 : 1;
        const amount = winner === 0 ? (counterBid ? winningPrice : bid) : price;
        const live = { player: index, seconds, leader: null, amount: 0, nextBid: bid, notice: "새 경매 선수 공개" };
        add("경매 선수 공개", `${players[index].name}(${roleNames[players[index].role]})가 공개됐어요. 남은 시간을 보며 입찰해요.`, [index], { durationMs: 2000, auction: live });
        add("내 첫 입찰", `A팀에서 ${bid} cr로 입찰해요. 입찰 금액은 상대 팀에도 바로 보입니다.`, [index], {
          durationMs: 2000, auction: { ...live, seconds: seconds - 2, leader: 0, amount: bid, nextBid: price, myAction: true, notice: `내 입찰 전송 · ${bid} cr` },
        });
        add("상대 팀 입찰 도착", raised ? `B팀이 ${price} cr로 올렸어요. 카운트다운이 흐르는 동안 재입찰할 수 있어요.` : "남은 선수의 최소 비용을 확보해야 해서 상대 팀은 추가 입찰을 하지 못해요.", [index], {
          durationMs: (seconds - (counterBid ? 7 : 4)) * 1000,
          auction: { ...live, seconds: seconds - 4, leader: raised ? 1 : 0, amount: raised ? price : bid, nextBid: price + bid, notice: raised ? `B팀 새 입찰 · ${price} cr` : "상대 팀 입찰 대기" },
        });
        if (counterBid) add("내 재입찰 · 시간 연장", `3초 남았을 때 A팀이 ${winningPrice} cr로 재입찰해요. 남은 시간이 5초로 늘어나 상대 팀도 대응할 수 있어요.`, [index], {
          durationMs: 5000, auction: { ...live, seconds: 5, leader: 0, amount: winningPrice, nextBid: winningPrice + bid, myAction: true, extended: true, notice: "마감 직전 입찰 · 3초 → 5초" },
        });
        add("입찰 마감", `${winner === 0 ? "내 A팀" : "상대 B팀"}이 ${amount} cr로 낙찰받아요. 종료된 경매에는 더 입찰할 수 없어요.`, [index], {
          auction: { ...live, seconds: 0, leader: winner, amount, nextBid: amount, notice: `${winner === 0 ? "A" : "B"}팀 낙찰 확정` },
        });
        teams[index] = winner; credits[winner] -= amount;
        add("선수 합류 · 크레딧 차감", `${players[index].name}이 ${winner === 0 ? "내 A팀" : "상대 B팀"}에 합류하고 ${amount} cr를 사용해요. 다음 선수는 자동으로 공개돼요.`, [index]);
      }
      for (const [first, second] of [[4, 5], [6, 7], [8, 9]]) {
        teams[first] = 0; teams[second] = 1;
        credits[0] -= bid; credits[1] -= bid;
        add(`남은 ${roleNames[players[first].role]} 선발`, `${players[first].name}·${players[second].name}도 같은 과정을 거쳐 예시에서는 최소 금액 ${bid} cr로 각각 합류해요.`, [first, second]);
      }
      if (settings.auctionItemsEnabled) add("남은 크레딧으로 아이템 선택", "팀원 선발 후 남은 크레딧으로 전략 아이템을 구매하거나 구매하지 않을 수 있어요.");
    }
    add("팀 구성 완료", "각 팀 5명의 역할 정원을 확인한 뒤 다음 단계로 넘어가요.");
  }
  return steps;
}
const labels = { keep: "현재 팀 유지", random: "역할별 추첨", draft: "주장 지명", auction: "팀원 경매" };
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function BalanceFormationPreview({ settings }: { settings: FormationSettings }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  const [{ step, playing, elapsed }, setPlayback] = useState({ step: 0, playing: true, elapsed: 0 });
  const sequence = buildSteps(settings);
  const last = sequence.length - 1;
  const current = reducedMotion ? last : Math.min(step, last);
  const frame = sequence[current];
  const finished = current === last;
  const duration = frame.durationMs ?? 2400;
  const remaining = Math.max(0, (frame.auction?.seconds ?? 0) - Math.floor(elapsed / 1000));
  useEffect(() => {
    if (!playing || reducedMotion || last === 0) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPlayback((value) => value.elapsed + 200 >= duration
        ? { step: (value.step + 1) % (last + 1), playing: true, elapsed: 0 }
        : { ...value, elapsed: value.elapsed + 200 });
    }, 200);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, last, duration]);
  const isCaptainMode = settings.teams === "draft" || settings.teams === "auction";
  const assignedTeam = (index: number) => frame.teams[index];
  const assignedCounts = [0, 0];
  return (
    <section className={cn("mt-3 overflow-hidden rounded-xl border bg-background", settings.teams === "auction" && styles.auctionMode)} aria-label="편성 방식 미리보기">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold min-[1100px]:text-base">{labels[settings.teams]} 미리보기</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground min-[1100px]:text-xs">{settings.teams === "auction" ? "A팀 주장 시점 · 자동 시연" : `예시 명단 · ${settings.roles === "lottery" ? "자동 배정" : "수동 배정"}`} · {reducedMotion ? "정적 미리보기" : "반복 재생"}</p>
        </div>
        {!reducedMotion && last > 0 && <div className="flex gap-1">
          <button type="button" className={styles.control} aria-label={playing ? "미리보기 일시정지" : "미리보기 재생"}
            onClick={() => setPlayback({ step, elapsed, playing: !playing })}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" className={styles.control} aria-label="미리보기 다시 보기"
            onClick={() => setPlayback({ step: 0, elapsed: 0, playing: true })}><RotateCcw size={13} /></button>
        </div>}
      </div>
      {frame.autoDraw ? <BalanceAutoDrawPreview scene={frame.autoDraw} players={players} elapsed={elapsed} /> : <div className={styles.board} aria-hidden="true">
        <div className="absolute inset-x-3 top-2 flex items-center justify-between text-[10px] text-muted-foreground min-[1100px]:text-xs">
          <span>{finished ? "팀 구성 완료" : "출전 선수"}</span>
          <span>{settings.teams === "draft" ? "A → B → B → A" : settings.teams === "auction" ? `${settings.durationSeconds}초 입찰` : "돌격 2 · 공격 4 · 지원 4"}</span>
        </div>
        {[0, 1].map((team) => <div key={team} className={cn(styles.team, team === 0 ? styles.teamA : styles.teamB)}>
          <div className="flex items-center justify-between text-[11px] font-semibold min-[1100px]:text-sm">
            <span>{team === 0 ? settings.teams === "auction" ? "A팀 · 내 팀" : "A팀" : settings.teams === "auction" ? "B팀 · 상대 팀" : "B팀"}</span>
            {settings.teams === "auction" && <span className="text-[10px] font-normal" data-testid={`preview-credits-${team}`}>{frame.credits[team]} cr</span>}
          </div>
        </div>)}
        {players.map((player, index) => {
          const team = assignedTeam(index);
          const row = team === null ? Math.floor(index / 5) : assignedCounts[team]++;
          const Icon = roleIcons[player.role];
          const active = frame.active.includes(index);
          return <div key={player.name} data-preview-player={index} data-preview-team={team === null ? "waiting" : team === 0 ? "A" : "B"} className={cn(styles.player, team === 0 && styles.playerA, team === 1 && styles.playerB, active && styles.active)}
            style={{ left: team === null ? `${3 + (index % 5) * 19}%` : team === 0 ? "3%" : "53%", top: `calc(${team === null ? 30 + row * 29 : 140 + row * 27}px * var(--preview-scale, 1))`, width: team === null ? "18%" : "44%" }}>
            {index < frame.rolesKnown && <Icon size={12} className="shrink-0 min-[1100px]:size-4" />}<span className="truncate">{player.name}</span>
            {isCaptainMode && index < 2 && team !== null && <Crown size={11} className="ml-auto shrink-0" />}
          </div>;
        })}
      </div>}
      {settings.teams === "auction" && <div className={styles.liveAuction} aria-label="A팀 주장 경매 화면">
        {frame.auction ? <>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0"><p className="text-xs text-muted-foreground">경매 중인 선수</p><p className="text-sm font-semibold">{players[frame.auction.player].name} · {roleNames[players[frame.auction.player].role]}</p></div>
          <div className={cn("text-right tabular-nums", remaining <= 5 && "text-orange-400")}>
            <strong className="text-xl" data-testid="auction-preview-timer">{remaining}초</strong>
            <p className="text-[10px]">{remaining === 0 ? "입찰 종료" : frame.auction.extended ? "연장된 시간" : "입찰 남은 시간"}</p>
          </div>
        </div>
        <div className="my-2 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, remaining / (frame.auction.extended ? 5 : settings.durationSeconds) * 100)}%` }} /></div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span>{frame.auction.leader === null ? "아직 입찰이 없어요" : frame.auction.leader === 0 ? "내 팀이 최고 입찰 중" : "상대 팀이 최고 입찰 중"}</span>
          <strong data-testid="auction-preview-price">{frame.auction.amount} cr</strong>
        </div>
        <p className="my-2 text-[11px] text-muted-foreground" data-testid="auction-preview-notice">{frame.auction.notice}</p>
        <div className={cn(styles.myBid, frame.auction.myAction && styles.bidClick)} key={`${current}`} aria-label="A팀 입찰 조작 예시">
          {remaining === 0 ? "경매 마감" : frame.auction.myAction ? `A팀 ${frame.auction.amount} cr 입찰 완료` : `내 입찰 ${frame.auction.nextBid} cr`}
          {frame.auction.myAction && <MousePointer2 size={18} className={styles.cursor} />}
        </div>
        </> : <div className="flex h-full flex-col justify-center gap-2">
          <p className="text-sm font-semibold">{finished ? "내 팀 선발 완료" : "A팀 주장 시점으로 보여드릴게요"}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{finished ? `내 팀 남은 크레딧 ${frame.credits[0]} cr · 선수 5명` : "선수 공개 → 내 입찰 → 상대 입찰 → 재입찰 → 낙찰. 시간과 입찰 금액이 양 팀 화면에 함께 반영돼요."}</p>
        </div>}
      </div>}
      <div className="min-h-28 space-y-2 border-t bg-muted/25 px-3 py-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold min-[1100px]:text-sm">
          <span data-testid="formation-preview-title">{frame.title}</span>
          <span className="shrink-0 text-[10px] font-normal text-muted-foreground" data-testid="formation-preview-step">{current + 1} / {sequence.length}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted-foreground/20" aria-hidden="true"><div className="h-full bg-primary" style={{ width: `${((current + 1) / sequence.length) * 100}%` }} /></div>
        <p className="text-xs leading-relaxed min-[1100px]:text-sm" data-testid="formation-preview-caption">{frame.text}</p>
      </div>
      <span className="sr-only">{labels[settings.teams]}. {players.map((player, index) => `${player.name} ${index < frame.rolesKnown ? roleNames[player.role] : "역할 배정 전"} ${assignedTeam(index) === null ? "대기" : assignedTeam(index) === 0 ? "A팀" : "B팀"}`).join(", ")}</span>
    </section>
  );
}
