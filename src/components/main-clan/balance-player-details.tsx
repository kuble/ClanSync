"use client";

import { cloneElement, useId, useState, type ReactElement, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MaEntry } from "@/lib/balance/ma-snapshot";
import type { PlayerSessionInfo } from "@/lib/balance/player-session-stats";
import { formatBalanceScore, SCORE_LABEL, type ScoreMode } from "@/lib/balance/score-display";
import type { PlayerCardInfoMode } from "@/lib/balance/formation";
import { ClanPlayerNamecard, useClanNamecard, useNamecardDecorationHidden } from "@/components/profile/clan-namecards";
import { cn } from "@/lib/utils";

export function BalancePlayerDetails({ children, nickname, info, score, premium = false, sample = false, enabled = true }: {
  children: ReactElement;
  nickname: string;
  info?: PlayerSessionInfo;
  score?: MaEntry;
  premium?: boolean;
  sample?: boolean;
  enabled?: boolean;
}) {
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  if (!enabled || (!info && !score)) return children;
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
      </TooltipContent>
    </Tooltip>
  );
}

export function BalancePlayerCardContent({ userId, nickname, info, score, showScore, showInfo = true, infoMode = "record", mode = "m", mirrored = false, scoreControl }: {
  userId?: string | null;
  nickname: string;
  info?: PlayerSessionInfo;
  score?: MaEntry;
  showScore?: boolean;
  showInfo?: boolean;
  infoMode?: PlayerCardInfoMode;
  mode?: ScoreMode;
  mirrored?: boolean;
  scoreControl?: ReactNode;
}) {
  const scoreVisible = Boolean(showScore);
  const card = useClanNamecard(userId);
  const hideDecoration = useNamecardDecorationHidden();
  const infoVisible = Boolean(showInfo && info);
  const centered = !scoreVisible;
  const streak = info?.currentStreak ?? 0;
  const infoLabel = infoMode === "record"
    ? info ? `${info.wins}승 ${info.draws}무 ${info.losses}패` : ""
    : streak > 0 ? `${streak}연승` : streak < 0 ? `${-streak}연패` : info && info.wins + info.draws + info.losses ? "연속 기록 없음" : "첫 경기 전";
  // Keep score-editing controls outside artwork clipping and team-selection overlays.
  if (card && !hideDecoration && !scoreControl) return <ClanPlayerNamecard userId={userId} fallback={nickname} fill>
    {scoreVisible || infoVisible ? <span className="flex flex-col items-end gap-1">
      {infoVisible && <span className="text-[10px] tabular-nums text-muted-foreground">{infoLabel}</span>}
      {scoreVisible && <span aria-label={`${SCORE_LABEL[mode]} ${formatBalanceScore(score?.[mode])}`} className="rounded-lg border border-current/10 bg-background/70 px-2 py-1 text-xs font-bold tabular-nums">{formatBalanceScore(score?.[mode]).replace(/점$/, "")}</span>}
    </span> : null}
  </ClanPlayerNamecard>;
  return <span className={cn(
    "flex w-full min-w-0 flex-col",
    centered ? "items-center justify-center" : "items-stretch gap-2 sm:items-center sm:gap-3",
    !centered && (mirrored ? "sm:flex-row-reverse" : "sm:flex-row"),
  )}>
    <span className={cn("min-w-0", centered ? "text-center" : "flex-1 text-left", !centered && mirrored && "sm:text-right")}>
      <ClanPlayerNamecard userId={userId} fallback={nickname} />
      {infoVisible && info ? <span className={cn("mt-1 flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground sm:text-xs", centered ? "justify-center" : mirrored && "sm:justify-end")}>
        <span>{infoLabel}</span>
      </span> : null}
    </span>
    {scoreVisible ? scoreControl ?? <span aria-label={`${SCORE_LABEL[mode]} ${formatBalanceScore(score?.[mode])}`} className="shrink-0 rounded-lg border border-current/10 bg-background/50 px-2 py-2 text-sm font-bold tabular-nums sm:min-w-16 sm:text-base">{formatBalanceScore(score?.[mode]).replace(/점$/, "")}</span> : null}
  </span>;
}
