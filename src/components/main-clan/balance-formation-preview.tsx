"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { FormationSettings, Role } from "@/lib/balance/formation";
import { cn } from "@/lib/utils";
import styles from "./balance-formation-preview.module.css";
import { AUTO_DRAW_ORDER, AUTO_DRAW_TEAMS, BalancePreviewScreen, type PreviewScene } from "./balance-preview-screen";

const players: { name: string; role: Role }[] = [
  { name: "새벽", role: "tank" }, { name: "구름", role: "tank" },
  { name: "네온", role: "dmg" }, { name: "에임", role: "dmg" },
  { name: "달빛", role: "dmg" }, { name: "바람", role: "dmg" },
  { name: "모찌", role: "sup" }, { name: "루나", role: "sup" },
  { name: "여우", role: "sup" }, { name: "감자", role: "sup" },
];
const roleNames = { tank: "돌격", dmg: "공격", sup: "지원" };
export type PreviewSettingField = "auctionBudget" | "minBid" | "durationSeconds" | "auctionPreparationSeconds" | "bidExtensionSeconds" | "strategySeconds";
export type PreviewSettingFocus = { field: PreviewSettingField; previousValue: number; value: number };
export type PreviewStep = {
  title: string;
  text: string;
  teams: (number | null)[];
  active: number[];
  rolesKnown: number;
  credits: number[];
  durationMs?: number;
  preparationSeconds?: number;
  scene: PreviewScene;
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
  const extension = Number.isFinite(settings.bidExtensionSeconds) ? Math.max(0, Math.min(30, settings.bidExtensionSeconds)) : 5;
  const preparation = Number.isFinite(settings.auctionPreparationSeconds) ? Math.max(0, Math.min(60, settings.auctionPreparationSeconds)) : 5;
  const lateSeconds = Math.min(3, Math.max(1, extension - 1));
  const credits = [budget, budget];
  const steps: PreviewStep[] = [];
  const add = (title: string, text: string, active: number[] = [], extra: Partial<PreviewStep> = {}) => {
    steps.push({ title, text, active, teams: [...teams], credits: [...credits], rolesKnown: 10, scene: { kind: "lineup" }, ...extra });
  };
  if (settings.roles === "lottery") {
    add("내 선호 역할 선택", "여우의 화면입니다. 이번 라운드에 원하는 역할의 순위를 먼저 정해요.", [], { rolesKnown: 0, scene: { kind: "preference" } });
    add("지원 1순위로 변경", "두 역할을 선택해 순서를 바꾸면 이번 라운드의 선호가 저장돼요.", [], { rolesKnown: 0, scene: { kind: "preference", preferenceChanged: true } });
    add("편성 화면으로 전환", "명단의 10명이 준비되면 운영진이 편성을 시작해요. 선호는 본인만 볼 수 있어요.", [], { rolesKnown: 0, scene: { kind: "roster" } });
    if (settings.teams === "random") AUTO_DRAW_ORDER.forEach((index) => { teams[index] = AUTO_DRAW_TEAMS[index]; });
    add("추첨 발표", settings.teams === "random"
      ? "공통 순서에 따라 선호 역할과 팀을 연속 공개해요. 여우는 2팀 지원으로 배정돼요."
      : `선호와 남은 역할 자리에 따라 10명의 역할을 연속 공개한 뒤 ${labels[settings.teams]}로 진행해요.`, [],
    { durationMs: 11000, scene: { kind: "draw", revealed: 0, continuous: true } });
  } else {
    add("수동 명단 확인", "운영진이 명단에서 선수의 역할과 자리를 배치해요.", [], { scene: { kind: "manual" } });
    add("역할 인원 확인", "돌격 2명 · 공격 4명 · 지원 4명인지 확인해요. 정한 역할은 팀원 선발에서도 유지돼요.", players.map((_, i) => i), { scene: { kind: "manual" } });
  }
  if (settings.teams === "keep") {
    add("현재 팀 유지", "역할 배정을 마친 뒤 현재 팀 구성을 유지해요.");
    add("팀 구성 완료", "각 팀에 돌격 1 · 공격 2 · 지원 2명. 이 라인업으로 다음 단계로 넘어가요.", [], { scene: { kind: "complete" } });
  } else if (settings.teams === "random") {
    if (settings.roles === "manual") {
    add("역할별로 모으기", "역할은 유지하고, 같은 역할의 선수끼리 팀을 추첨해요.", [], { scene: { kind: "draw", revealed: 0 } });
    for (const [indices, title, text] of [
      [[0, 1], "돌격 팀 추첨", "돌격 2명을 한 명씩 A팀과 B팀에 배치해요."],
      [[2, 3], "첫 공격 자리 추첨", "공격 선수 두 명을 양 팀의 첫 공격 자리에 배치해요."],
      [[4, 5], "두 번째 공격 자리 추첨", "남은 공격 두 명도 나눠 각 팀 공격 2명을 맞춰요."],
      [[6, 7], "첫 지원 자리 추첨", "지원 두 명을 양 팀의 첫 지원 자리에 배치해요."],
      [[8, 9], "두 번째 지원 자리 추첨", "남은 지원 두 명을 나눠 팀 구성을 완성해요."],
    ] as const) {
      for (const index of indices) teams[index] = index % 2;
      add(title, text, [...indices], { scene: { kind: "draw" } });
    }
    }
    add("팀 구성 완료", "각 팀에 돌격 1 · 공격 2 · 지원 2명! 역할 정원을 유지해요.", [], { scene: { kind: "complete" } });
  } else {
    teams[0] = 0; teams[1] = 1;
    add("양 팀 주장 배치", settings.roles === "lottery"
      ? "자동 배정으로 돌격이 된 두 선수가 양 팀 주장을 맡아요."
      : "예시는 양 팀 돌격이 주장입니다. 수동 배정에서는 같은 역할의 두 선수를 지정할 수 있어요.", [0, 1], { scene: { kind: "captains" } });
    if (settings.teams === "draft") {
      add("선픽 팀 추첨", "먼저 고를 팀을 추첨해요. 이 예시에서는 A팀이 선픽입니다.", [], { scene: { kind: "draft", turn: 0 } });
      const order = [0, 1, 1, 0, 0, 1, 1, 0];
      order.forEach((team, pick) => {
        const index = pick + 2;
        teams[index] = team;
        add(`${pick + 1}번째 지명 · ${team === 0 ? "A" : "B"}팀`,
          `${team === 0 ? "A" : "B"}팀이 ${players[index].name}(${roleNames[players[index].role]})를 지명해요. ${pick === 2 || pick === 4 || pick === 6 ? "같은 팀이 연속으로 고르는 차례예요." : "A → B → B → A 순서로 번갈아 진행해요."}`, [index], { scene: { kind: "draft", turn: team } });
      });
    } else {
      if (settings.auctionItemsEnabled) {
        add("전략 아이템 공개", "등록된 활성 아이템 중 3개를 먼저 무작위로 공개해요.", [], { scene: { kind: "strategy" } });
        add("전략 준비", `${settings.strategySeconds}초 동안 팀 전략을 준비한 뒤 선수 경매를 시작해요.`, [], { scene: { kind: "strategy" } });
      }
      add("A팀 주장 시점", "A팀 주장 시점으로 보여드릴게요. 내 팀 크레딧을 보며 상대 팀과 입찰 경쟁을 해요.", [], { scene: { kind: "auction" } });
      {
        const index = 2;
        const desiredWinner = 0;
        const raised = price > bid;
        const winningPrice = desiredWinner === 0 ? Math.min(bid * 3, budget - bid * 3) : price;
        const counterBid = desiredWinner === 0 && winningPrice > price;
        const winner = counterBid || !raised ? 0 : 1;
        const amount = winner === 0 ? (counterBid ? winningPrice : bid) : price;
        const live = { player: index, seconds, leader: null, amount: 0, nextBid: bid, notice: "새 경매 선수 공개" };
        add("경매 선수 공개", `${players[index].name}(${roleNames[players[index].role]})가 공개됐어요. 남은 시간을 보며 입찰해요.`, [index], { scene: { kind: "auction" }, durationMs: 2000, auction: live });
        add("내 첫 입찰", `A팀에서 ${bid} cr로 입찰해요. 입찰 금액은 상대 팀에도 바로 보입니다.`, [index], {
          scene: { kind: "auction" }, durationMs: 2000, auction: { ...live, seconds: seconds - 2, leader: 0, amount: bid, nextBid: price, myAction: true, notice: `내 입찰 전송 · ${bid} cr` },
        });
        add("상대 팀 입찰 도착", raised ? `B팀이 ${price} cr로 올렸어요. 카운트다운이 흐르는 동안 재입찰할 수 있어요.` : "남은 선수의 최소 비용을 확보해야 해서 상대 팀은 추가 입찰을 하지 못해요.", [index], {
          scene: { kind: "auction" }, durationMs: (seconds - (counterBid ? 4 + lateSeconds : 4)) * 1000,
          auction: { ...live, seconds: seconds - 4, leader: raised ? 1 : 0, amount: raised ? price : bid, nextBid: price + bid, notice: raised ? `B팀 새 입찰 · ${price} cr` : "상대 팀 입찰 대기" },
        });
        if (counterBid) add(extension > lateSeconds ? "내 재입찰 · 시간 연장" : "내 재입찰", extension > lateSeconds ? `${lateSeconds}초 남았을 때 A팀이 ${winningPrice} cr로 재입찰해요. 마지막 ${extension}초의 입찰은 남은 시간을 ${extension}초로 연장해요(최대 기본 시간 + 30초).` : `A팀이 ${winningPrice} cr로 재입찰해요. ${extension === 0 ? "시간 연장은 꺼져 있어요." : `마지막 ${extension}초에 입찰하면 남은 시간을 ${extension}초로 연장해요(최대 기본 시간 + 30초).`}`, [index], {
          scene: { kind: "auction" }, durationMs: Math.max(lateSeconds, extension) * 1000, auction: { ...live, seconds: Math.max(lateSeconds, extension), leader: 0, amount: winningPrice, nextBid: winningPrice + bid, myAction: true, extended: extension > lateSeconds, notice: extension > lateSeconds ? `마감 직전 입찰 · ${lateSeconds}초 → ${extension}초` : `입찰 연장 ${extension}초 설정` },
        });
        add("입찰 마감", `${winner === 0 ? "내 A팀" : "상대 B팀"}이 ${amount} cr로 낙찰받아요. 종료된 경매에는 더 입찰할 수 없어요.`, [index], {
          scene: { kind: "settlement" }, auction: { ...live, seconds: 0, leader: winner, amount, nextBid: amount, notice: `${winner === 0 ? "A" : "B"}팀 낙찰 확정` },
        });
        teams[index] = winner; credits[winner] -= amount;
        add("선수 합류 · 다음 입찰 준비", `${players[index].name}이 A팀에 합류하고 ${amount} cr를 사용해요. 낙찰 시점부터 ${preparation}초 동안 다음 입찰 금액을 정해요. ${preparation < 3 ? "낙찰 결과는 최소 2.5초 동안 보여줘요." : "다음 경매 선수를 미리 보고 준비해요."}`, [index], { scene: { kind: "preparation" }, preparationSeconds: preparation, durationMs: Math.max(2500, preparation * 1000) });
      }
      teams[3] = 1; credits[1] -= price;
      for (const [first, second] of [[4, 5], [6, 7], [8, 9]]) {
        teams[first] = 0; teams[second] = 1;
        credits[0] -= bid; credits[1] -= bid;
      }
      add("남은 선수 선발", "나머지 선수도 같은 입찰과 준비 과정을 거쳐 각 팀의 역할 자리를 채워요. 무입찰은 한 번 재경매한 뒤 가능한 팀에 최소가로 추첨 배정해요.", [3, 4, 5, 6, 7, 8, 9]);
      if (settings.auctionItemsEnabled) add("남은 크레딧으로 아이템 선택", "팀원 선발 후 남은 크레딧으로 전략 아이템을 구매하거나 구매하지 않을 수 있어요.", [], { scene: { kind: "items" } });
    }
    add("팀 구성 완료", "각 팀 5명의 역할 정원을 확인한 뒤 다음 단계로 넘어가요.", [], { scene: { kind: "complete" } });
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

const sceneLabels: Record<PreviewScene["kind"], string> = {
  preference: "선호 선택", roster: "명단 확인", manual: "역할 배치", draw: "추첨 발표",
  lineup: "팀 배치", captains: "주장 선정", draft: "지명", strategy: "전략 준비",
  auction: "입찰", settlement: "낙찰", preparation: "다음 선수 준비", items: "아이템 선택", complete: "결과",
};

function focusedStep(sequence: PreviewStep[], field: PreviewSettingField) {
  const index = sequence.findIndex((item) => field === "strategySeconds" ? item.title === "전략 준비"
    : field === "auctionPreparationSeconds" ? item.scene.kind === "preparation"
    : field === "bidExtensionSeconds" ? item.auction?.myAction && item.auction.leader === 0 && item.title.startsWith("내 재입찰")
    : item.scene.kind === "auction" && item.auction?.leader === null);
  return index < 0 ? null : index;
}

export function BalanceFormationPreview({ settings, focus = null }: { settings: FormationSettings; focus?: PreviewSettingFocus | null }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  const sequence = useMemo(() => buildSteps(settings), [settings]);
  const [playback, setPlayback] = useState({ step: 0, playing: true, elapsed: 0, selected: false, focusRequest: null as PreviewSettingFocus | null, highlighted: false });
  if (playback.focusRequest !== focus) {
    const index = focus && settings.teams === "auction" ? focusedStep(sequence, focus.field) : null;
    setPlayback({ ...playback, focusRequest: focus, highlighted: index !== null,
      ...(index !== null ? { step: index, elapsed: 0, playing: false, selected: true } : {}) });
  }
  const { step, playing, elapsed, selected, highlighted } = playback;
  const last = sequence.length - 1;
  const current = reducedMotion && !selected ? last : Math.min(step, last);
  const savedFrame = sequence[current];
  const frame = savedFrame.scene.continuous ? { ...savedFrame, scene: { ...savedFrame.scene,
    revealed: reducedMotion ? players.length : Math.max(0, Math.min(players.length, Math.floor((elapsed - 1000) / 800) + 1)),
  } } : savedFrame;
  // Hold explanations long enough to read, even when the illustrated event is brief.
  const duration = Math.max(6000, frame.durationMs ?? 6000);
  const simulatedElapsed = elapsed * ((frame.durationMs ?? duration) / duration);
  const remaining = Math.max(0, (frame.auction?.seconds ?? frame.preparationSeconds ?? 0) - Math.floor(simulatedElapsed / 1000));
  const chapterStarts = sequence.flatMap((item, index) => index === 0 || item.scene.kind !== sequence[index - 1].scene.kind
    ? [{ index, kind: item.scene.kind, label: sceneLabels[item.scene.kind] }] : []);
  const chapters = chapterStarts.map((item, index) => ({ ...item, label: chapterStarts.filter((other) => other.kind === item.kind).length > 1
    ? `${item.label} ${chapterStarts.slice(0, index + 1).filter((other) => other.kind === item.kind).length}` : item.label }));
  const chapter = chapters.findLast((item) => item.index <= current)!;
  const seek = (index: number) => setPlayback({ ...playback, step: index, elapsed: 0, playing: false, selected: true, highlighted: false });
  useEffect(() => {
    if (!playing || reducedMotion || last === 0) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPlayback((value) => value.elapsed + 200 >= duration
        ? { ...value, step: (value.step + 1) % (last + 1), playing: true, elapsed: 0, selected: false }
        : { ...value, elapsed: value.elapsed + 200 });
    }, 200);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, last, duration]);
  return (
    <section className={cn("mt-3 overflow-hidden rounded-xl border bg-background", styles.previewContainer)} aria-label="편성 방식 미리보기">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold min-[1100px]:text-base">{labels[settings.teams]} 미리보기</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground min-[1100px]:text-xs">예시 명단 · {settings.roles === "lottery" ? "자동 배정" : "수동 배정"} · {reducedMotion ? "정적 미리보기" : "느린 반복 재생"}</p>
        </div>
        {!reducedMotion && <div className="flex gap-1">
          <button type="button" className={styles.control} aria-label={playing ? "미리보기 일시정지" : "미리보기 재생"}
            onClick={() => setPlayback({ ...playback, step: current, elapsed, playing: !playing, selected: false, highlighted: false })}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" className={styles.control} aria-label="미리보기 다시 보기"
            onClick={() => setPlayback({ ...playback, step: 0, elapsed: 0, playing: true, selected: false, highlighted: false })}><RotateCcw size={13} /></button>
        </div>}
      </div>
      <BalancePreviewScreen frame={frame} settings={settings} players={players} elapsed={elapsed} remaining={remaining} focus={highlighted ? focus : null} />
      <div className={styles.previewFooter}>
        <div className="flex items-center justify-between gap-2 text-xs font-semibold min-[1100px]:text-sm">
          <span data-testid="formation-preview-title">{frame.title}</span>
          <span className="shrink-0 text-[10px] font-normal text-muted-foreground" data-testid="formation-preview-step">{current + 1} / {sequence.length}</span>
        </div>
        <p className="text-xs leading-relaxed min-[1100px]:text-sm" data-testid="formation-preview-caption">{frame.text}</p>
        <input type="range" className={styles.timeline} min={0} max={last} step={1} value={current}
          aria-label="미리보기 타임라인" aria-valuetext={`${current + 1}단계 · ${frame.title}`}
          onChange={(event) => seek(Number(event.target.value))} />
        <nav className={styles.chapters} aria-label="미리보기 구간">
          {chapters.map((item, index) => <button type="button" key={item.index} className={cn(styles.chapter, item.index === chapter.index && styles.chapterSelected)}
            aria-label={`${index + 1}. ${item.label} 구간 보기`} aria-current={item.index === chapter.index ? "step" : undefined}
            onClick={() => seek(item.index)}>{item.label}</button>)}
        </nav>
        <p className="text-[10px] text-muted-foreground">{highlighted ? "편집 중인 값의 위치를 강조했어요. 재생하거나 구간을 선택하면 시연을 이어 볼 수 있어요." : "수치 입력을 선택하면 적용 위치를 강조합니다. 타임라인이나 구간을 선택하면 해당 장면에서 일시정지합니다."}</p>
      </div>
    </section>
  );
}
