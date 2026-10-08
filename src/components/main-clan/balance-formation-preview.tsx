"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Crown, Pause, Play, RotateCcw, Shield, Cross, Swords } from "lucide-react";
import type { FormationSettings, Role } from "@/lib/balance/formation";
import { cn } from "@/lib/utils";
import styles from "./balance-formation-preview.module.css";

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
  bid?: string;
};
function buildSteps(settings: FormationSettings): PreviewStep[] {
  const teams: (number | null)[] = players.map((_, index) => settings.teams === "keep" ? index % 2 : null);
  const budget = Number.isFinite(settings.auctionBudget) ? Math.max(40, settings.auctionBudget) : 1000;
  const bid = Number.isFinite(settings.minBid) ? Math.max(1, Math.min(settings.minBid, Math.floor(budget / 4))) : 10;
  const price = Math.min(bid * 2, budget - bid * 3);
  const credits = [budget, budget];
  const steps: PreviewStep[] = [];
  const add = (title: string, text: string, active: number[] = [], extra: Partial<PreviewStep> = {}) => {
    steps.push({ title, text, active, teams: [...teams], credits: [...credits], rolesKnown: 10, ...extra });
  };
  if (settings.roles === "lottery") {
    add("선호 역할 확인", "자동 배정은 각 선수의 선호 역할과 남은 자리를 확인해요.", [], { rolesKnown: 0 });
    add("공통 순서 추첨", "모든 선수가 같은 추첨 순서로 역할을 배정받아요.", [0, 1], { rolesKnown: 0 });
    add("돌격 자리 배정", "예시의 새벽·구름은 선호와 남은 자리에 따라 돌격에 배정돼요.", [0, 1], { rolesKnown: 2 });
    add("공격 자리 배정", "순서대로 선호를 확인하며 남은 공격 4자리를 채워요.", [2, 3, 4, 5], { rolesKnown: 6 });
    add("지원 자리 배정", "지원 4자리까지 채운 뒤 이 역할을 유지하며 팀을 나눠요.", [6, 7, 8, 9]);
  } else {
    add("수동 명단 확인", "수동 배정은 명단에서 정한 역할을 그대로 사용해요.");
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
      for (const [index, winner] of [[2, 1], [3, 0]] as const) {
        const firstTeam = price > bid ? 1 - winner : winner;
        add("경매 선수 공개", `${players[index].name}(${roleNames[players[index].role]})를 공개하고 ${settings.durationSeconds}초 입찰을 시작해요.`, [index]);
        add("첫 입찰", `${firstTeam === 0 ? "A" : "B"}팀이 최소 금액 ${bid} cr로 입찰해요.`, [index], { bid: `${firstTeam === 0 ? "A" : "B"}팀 ${bid} cr 입찰` });
        add("입찰 경쟁", price > bid ? `${winner === 0 ? "A" : "B"}팀이 ${price} cr로 올려요. 남은 선수의 최소 비용도 확보해야 해요.` : "남은 선수의 최소 비용을 확보해야 해서 추가 입찰을 할 수 없어요.", [index], { bid: `${winner === 0 ? "A" : "B"}팀 ${price} cr 입찰` });
        add("입찰 마감", "마지막 5초 입찰은 5초 연장돼요(최대 기본 시간 + 30초). 입찰 종료 후 최고 입찰 팀이 낙찰받아요.", [index], { bid: `${winner === 0 ? "A" : "B"}팀 ${price} cr 낙찰` });
        teams[index] = winner; credits[winner] -= price;
        add("선수 합류 · 크레딧 차감", `${players[index].name}이 ${winner === 0 ? "A" : "B"}팀에 합류하고 ${price} cr를 사용해요. 다음 선수는 자동으로 공개돼요.`, [index]);
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
  const [{ step, playing }, setPlayback] = useState({ step: 0, playing: true });
  const sequence = buildSteps(settings);
  const last = sequence.length - 1;
  const current = reducedMotion ? last : Math.min(step, last);
  const frame = sequence[current];
  const finished = current === last;
  useEffect(() => {
    if (!playing || reducedMotion || last === 0) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPlayback((value) => ({ step: (value.step + 1) % (last + 1), playing: true }));
    }, 2400);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, last]);
  const isCaptainMode = settings.teams === "draft" || settings.teams === "auction";
  const assignedTeam = (index: number) => frame.teams[index];
  const assignedCounts = [0, 0];
  return (
    <section className="mt-3 overflow-hidden rounded-xl border bg-background" aria-label="편성 방식 미리보기">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold min-[1100px]:text-base">{labels[settings.teams]} 미리보기</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground min-[1100px]:text-xs">예시 명단 · {settings.roles === "lottery" ? "자동 배정" : "수동 배정"} · {reducedMotion ? "정적 미리보기" : "반복 재생"}</p>
        </div>
        {!reducedMotion && last > 0 && <div className="flex gap-1">
          <button type="button" className={styles.control} aria-label={playing ? "미리보기 일시정지" : "미리보기 재생"}
            onClick={() => setPlayback({ step, playing: !playing })}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" className={styles.control} aria-label="미리보기 다시 보기"
            onClick={() => setPlayback({ step: 0, playing: true })}><RotateCcw size={13} /></button>
        </div>}
      </div>
      <div className={styles.board} aria-hidden="true">
        <div className="absolute inset-x-3 top-2 flex items-center justify-between text-[10px] text-muted-foreground min-[1100px]:text-xs">
          <span>{finished ? "팀 구성 완료" : "출전 선수"}</span>
          <span>{settings.teams === "draft" ? "A → B → B → A" : settings.teams === "auction" ? `${settings.durationSeconds}초 입찰` : "돌격 2 · 공격 4 · 지원 4"}</span>
        </div>
        {[0, 1].map((team) => <div key={team} className={cn(styles.team, team === 0 ? styles.teamA : styles.teamB)}>
          <div className="flex items-center justify-between text-[11px] font-semibold min-[1100px]:text-sm">
            <span>{team === 0 ? "A팀" : "B팀"}</span>
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
        {frame.bid && <div className={styles.bid}>{frame.bid}</div>}
      </div>
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
