"use client";

import { cloneElement, useId, useState, type ReactElement } from "react";
import { Mic, MicOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MaEntry } from "@/lib/balance/ma-snapshot";
import type { PlayerSessionInfo } from "@/lib/balance/player-session-stats";
import { formatBalanceScore, SCORE_LABEL, type ScoreMode } from "@/lib/balance/score-display";

export function BalancePlayerDetails({ children, nickname, info, score, premium = false, sample = false }: {
  children: ReactElement;
  nickname: string;
  info?: PlayerSessionInfo;
  score?: MaEntry;
  premium?: boolean;
  sample?: boolean;
}) {
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  if (!info && !score) return children;
  const streak = info?.currentStreak ?? 0;
  const trigger = children as ReactElement<{ "aria-describedby"?: string }>;
  const describedBy = [trigger.props["aria-describedby"], open ? descriptionId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <Tooltip open={open} onOpenChange={setOpen} disableHoverablePopup>
      <TooltipTrigger render={cloneElement(trigger, { "aria-describedby": describedBy })} delay={300} />
      <TooltipContent id={descriptionId} role="tooltip" className="pointer-events-none block w-64 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl [&>div]:bg-popover" sideOffset={8}>
        <p className="break-words text-sm font-bold">{nickname}</p>
        {info ? <>
          <p className="mt-3 text-[10px] opacity-65">이번 세션 전적</p>
          <p className="mt-1 text-base font-semibold tabular-nums">{info.wins}승 {info.draws}무 {info.losses}패</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="opacity-65">승률</dt><dd className="mt-1 font-semibold tabular-nums">{info.winRate == null ? "기록 없음" : `${Math.round(info.winRate * 10) / 10}%`}</dd></div>
            <div><dt className="opacity-65">현재 흐름</dt><dd className="mt-1 font-semibold">{streak > 0 ? `${streak}연승` : streak < 0 ? `${-streak}연패` : info.wins + info.draws + info.losses ? "연속 기록 없음" : "첫 경기 전"}</dd></div>
          </dl>
        </> : null}
        {score ? <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-current/15 pt-3 text-xs">
          <div><dt className="opacity-65">{SCORE_LABEL.m}</dt><dd className="mt-1 font-bold tabular-nums">{formatBalanceScore(score.m)}</dd></div>
          {premium ? <div><dt className="opacity-65">{SCORE_LABEL.a}</dt><dd className="mt-1 font-bold tabular-nums">{formatBalanceScore(score.a)}</dd></div> : null}
          {sample ? <dd className="col-span-2 text-[10px] opacity-60">화면 확인용 샘플 점수</dd> : null}
        </dl> : null}
        <p className="mt-3 border-t border-current/15 pt-3 text-xs">마이크 <strong className="float-right">{info?.micAvailable === true ? "사용" : info?.micAvailable === false ? "미사용" : "미설정"}</strong></p>
      </TooltipContent>
    </Tooltip>
  );
}

export function BalancePlayerCardContent({ nickname, info, score, showScore, mode = "m", mirrored = false }: {
  nickname: string;
  info?: PlayerSessionInfo;
  score?: MaEntry;
  showScore?: boolean;
  mode?: ScoreMode;
  mirrored?: boolean;
}) {
  return <span className={`flex w-full min-w-0 flex-col items-stretch gap-2 sm:items-center sm:gap-3 ${mirrored ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
    <span className={`min-w-0 flex-1 text-left ${mirrored ? "sm:text-right" : ""}`}>
      <span className="block truncate text-xs font-bold sm:text-sm">{nickname}</span>
      {info ? <span className={`mt-1 flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground sm:text-xs ${mirrored ? "sm:justify-end" : ""}`}>
        <span>{info.wins}승 {info.draws}무 {info.losses}패</span>
        {info.micAvailable === true ? <Mic className="size-3" aria-label="마이크 사용" /> : info.micAvailable === false ? <MicOff className="size-3" aria-label="마이크 미사용" /> : null}
      </span> : null}
    </span>
    {showScore ? <span aria-label={`${SCORE_LABEL[mode]} ${formatBalanceScore(score?.[mode])}`} className="shrink-0 rounded-lg border border-current/10 bg-background/50 px-2 py-2 text-sm font-bold tabular-nums sm:min-w-16 sm:text-base">{formatBalanceScore(score?.[mode])}</span> : null}
  </span>;
}
