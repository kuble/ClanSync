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
const sequences = {
  keep: ["배치한 팀과 역할을 그대로 사용해요."],
  random: ["역할별로 선수를 모아요.", "같은 역할 안에서 팀을 추첨해요.", "각 팀에 돌격 1 · 공격 2 · 지원 2명!"],
  draft: ["두 주장이 팀원을 고를 준비를 해요.", "양 팀의 주장을 먼저 배치해요.", "A팀이 첫 선수를 지명해요.", "B팀이 다음 선수를 지명해요.", "이번에도 B팀 차례예요.", "A → B → B → A 순서로 팀을 완성해요."],
  auction: ["두 주장이 팀 크레딧을 준비해요.", "선수를 한 명씩 경매에 올려요.", "A팀이 먼저 입찰해요.", "B팀이 더 높은 금액을 제시해요.", "시간 종료! 최고 입찰 팀에 합류해요.", "다음 선수도 같은 방식으로 선발해요."],
};
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
  const sequence = sequences[settings.teams];
  const last = sequence.length - 1;
  const current = reducedMotion ? last : step;
  const finished = current === last;
  useEffect(() => {
    if (!playing || reducedMotion || last === 0) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPlayback((value) => value.step < last
        ? { step: value.step + 1, playing: value.step + 1 < last }
        : value);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, last]);
  const isCaptainMode = settings.teams === "draft" || settings.teams === "auction";
  const bid = Number.isFinite(settings.minBid) ? Math.max(1, settings.minBid) : 10;
  const budget = Number.isFinite(settings.auctionBudget) ? settings.auctionBudget : 1000;
  const nextBid = Math.min(budget, bid * 2);
  const assignedTeam = (index: number): number | null => {
    if (settings.teams === "keep" || finished || (settings.teams === "random" && current >= 1)) {
      // Preserve the 1/2/2 role composition on both example teams.
      if (settings.teams === "auction" && index === 2) return 1;
      if (settings.teams === "auction" && index === 3) return 0;
      if (settings.teams === "draft" && index === 4) return 1;
      if (settings.teams === "draft" && index === 5) return 0;
      return index % 2;
    }
    if (isCaptainMode && current >= 1 && index < 2) return index;
    if (settings.teams === "draft") {
      if (current >= 2 && index === 2) return 0;
      if (current >= 3 && index === 3) return 1;
      if (current >= 4 && index === 4) return 1;
    }
    if (settings.teams === "auction" && current >= 4 && index === 2) return 1;
    return null;
  };
  const assignedCounts = [0, 0];
  return (
    <section className="mt-3 overflow-hidden rounded-xl border bg-background" aria-label="편성 방식 미리보기">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold">{labels[settings.teams]} 미리보기</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">예시 명단 · {settings.roles === "lottery" ? "선호 역할과 추첨 순서로 역할 배정" : "직접 배정한 역할 사용"}</p>
        </div>
        {!reducedMotion && last > 0 && <div className="flex gap-1">
          <button type="button" className={styles.control} aria-label={playing && !finished ? "미리보기 일시정지" : "미리보기 재생"}
            onClick={() => setPlayback({ step: finished ? 0 : step, playing: !playing || finished })}>
            {playing && !finished ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" className={styles.control} aria-label="미리보기 다시 보기"
            onClick={() => setPlayback({ step: 0, playing: true })}><RotateCcw size={13} /></button>
        </div>}
      </div>
      <div className={styles.board} aria-hidden="true">
        <div className="absolute inset-x-3 top-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{finished ? "팀 구성 완료" : "출전 선수"}</span>
          <span>{settings.teams === "draft" ? "A → B → B → A" : settings.teams === "auction" ? `${settings.durationSeconds}초 입찰` : "돌격 2 · 공격 4 · 지원 4"}</span>
        </div>
        {[0, 1].map((team) => <div key={team} className={cn(styles.team, team === 0 ? styles.teamA : styles.teamB)}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>{team === 0 ? "A팀" : "B팀"}</span>
            {settings.teams === "auction" && !finished && <span className="text-[10px] font-normal">{team === 1 && current >= 4 ? Math.max(0, budget - nextBid) : budget} cr</span>}
          </div>
        </div>)}
        {players.map((player, index) => {
          const team = assignedTeam(index);
          const row = team === null ? Math.floor(index / 5) : assignedCounts[team]++;
          const Icon = roleIcons[player.role];
          const active = settings.teams === "auction" && index === 2 && current >= 1 && current < 4;
          return <div key={player.name} className={cn(styles.player, team === 0 && styles.playerA, team === 1 && styles.playerB, active && styles.active)}
            style={{ left: team === null ? `${3 + (index % 5) * 19}%` : team === 0 ? "3%" : "53%", top: team === null ? 30 + row * 29 : 140 + row * 27, width: team === null ? "18%" : "44%" }}>
            <Icon size={12} className="shrink-0" /><span className="truncate">{player.name}</span>
            {isCaptainMode && index < 2 && team !== null && <Crown size={11} className="ml-auto shrink-0" />}
          </div>;
        })}
        {settings.teams === "auction" && current >= 2 && current < 4 && <div className={styles.bid}>
          {current === 2 ? `A팀 ${bid} cr` : `B팀 ${nextBid} cr`} <span className="text-muted-foreground">입찰</span>
        </div>}
      </div>
      <div className="flex min-h-14 items-center gap-3 border-t bg-muted/25 px-3 py-2.5">
        <div className="flex shrink-0 gap-1" aria-hidden="true">
          {sequence.map((_, index) => <span key={index} className={cn("h-1 w-2 rounded-full", index <= current ? "bg-primary" : "bg-muted-foreground/20")} />)}
        </div>
        <p className="text-xs leading-relaxed" data-testid="formation-preview-caption">{sequence[current]}</p>
      </div>
      <span className="sr-only">{labels[settings.teams]}. {sequence[current]} {players.map((player, index) => `${player.name} ${roleNames[player.role]} ${assignedTeam(index) === null ? "대기" : assignedTeam(index) === 0 ? "A팀" : "B팀"}`).join(", ")}</span>
    </section>
  );
}
