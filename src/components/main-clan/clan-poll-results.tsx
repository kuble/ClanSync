"use client";

import { useState } from "react";
import { Check, Trophy } from "lucide-react";
import type { SerializedClanPoll } from "@/lib/clan/load-clan-polls";
import { HelpText } from "./help-text";
import { cn } from "@/lib/utils";

const colors = ["#46ba8b", "#65a8e0", "#bd96df", "#e5b05f", "#df859b", "#6bc9c4", "#9cba6d", "#8f94dc", "#cba281", "#8fb5c0", "#d2bd77", "#b78eae"];

export function ClanPollResults({ poll, closed }: { poll: SerializedClanPoll; closed: boolean }) {
  const total = poll.options.reduce((sum, option) => sum + option.vote_count, 0);
  const highest = Math.max(0, ...poll.options.map((option) => option.vote_count));
  const leaders = poll.options.filter((option) => highest > 0 && option.vote_count === highest);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = poll.options.find((option) => option.id === activeId);
  const options = closed ? [...poll.options].sort((a, b) => b.vote_count - a.vote_count || a.sort_order - b.sort_order) : poll.options;
  // A full circle uses a normalized circumference of 100, including a single-option winner.
  const segments = poll.options.map((option, index, all) => ({
    ...option, color: colors[index % colors.length],
    length: total ? option.vote_count / total * 100 : 0,
    offset: total ? all.slice(0, index).reduce((sum, entry) => sum + entry.vote_count, 0) / total * 100 : 0,
  }));

  return <section aria-label="투표 결과" className="space-y-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold"><HelpText label={closed ? "최종 결과" : "현재 결과"} help={poll.anonymous ? "익명 투표는 참여자 정보를 공개하지 않습니다." : "차트나 선택지에 커서를 올리면 참여자를 확인할 수 있습니다. 키보드 초점과 터치로도 선택할 수 있습니다."} /></h3><span className="text-xs tabular-nums text-muted-foreground">총 {total}표</span></div>
    <div className="relative mx-auto size-52">
      <svg aria-hidden viewBox="0 0 120 120" className="size-full -rotate-90 overflow-visible">
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" className="text-muted" strokeWidth="17" />
        {segments.filter((segment) => segment.length > 0).map((segment) => <circle key={segment.id} cx="60" cy="60" r="46" pathLength="100" fill="none"
          stroke={segment.color} strokeWidth={activeId === segment.id ? 20 : 17}
          strokeDasharray={`${Math.max(segment.length - (segment.length === 100 ? 0 : 0.8), 0.1)} 100`} strokeDashoffset={-segment.offset}
          className="cursor-pointer transition-[stroke-width,opacity] motion-reduce:transition-none"
          opacity={activeId && activeId !== segment.id ? 0.45 : 1}
          onMouseEnter={() => setActiveId(segment.id)} onClick={() => setActiveId(segment.id)} />)}
      </svg>
      <div className="pointer-events-none absolute inset-9 flex flex-col items-center justify-center text-center">
        <span className="max-w-full truncate px-2 text-xs text-muted-foreground">{active ? active.label : "전체 선택"}</span>
        <span className="mt-1 text-3xl font-semibold tabular-nums">{active ? active.vote_count : total}<span className="ml-1 text-sm font-normal text-muted-foreground">표</span></span>
      </div>
    </div>
    {!total && <p className="text-center text-sm text-muted-foreground">{closed ? "참여한 표가 없습니다." : "아직 투표한 사람이 없습니다. 첫 표를 남겨 보세요."}</p>}
    <ol className="divide-y divide-border">
      {options.map((option) => {
        const winner = closed && highest > 0 && option.vote_count === highest;
        return <li key={option.id}>
          <button type="button" aria-pressed={activeId === option.id} aria-label={`${option.label} 참여자 보기`}
            onMouseEnter={() => setActiveId(option.id)} onFocus={() => setActiveId(option.id)} onClick={() => setActiveId(option.id)}
            className={cn("flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-3 text-left focus-visible:outline-2 focus-visible:outline-ring", activeId === option.id && "bg-muted/40")}>
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segments.find((entry) => entry.id === option.id)!.color }} />
            <span className="min-w-0 flex-1 break-words text-sm font-medium">
              {option.label}
              <span className="mt-1 flex flex-wrap gap-2 text-[10px] font-normal text-primary">
                {winner && <span className="inline-flex items-center gap-1"><Trophy className="size-3" aria-hidden />{leaders.length > 1 ? "공동 1위" : "최다 득표"}</span>}
                {poll.my_option_ids.includes(option.id) && <span className="inline-flex items-center gap-1"><Check className="size-3" aria-hidden />내 선택</span>}
              </span>
            </span>
            <span className="shrink-0 text-right tabular-nums"><span className="block text-sm font-semibold">{total ? Math.round(option.vote_count / total * 100) : 0}%</span><span className="text-[11px] text-muted-foreground">{option.vote_count}표</span></span>
          </button>
        </li>;
      })}
    </ol>
    <div className="min-h-20 rounded-lg border border-border bg-muted/20 p-3 text-xs" aria-live="polite" aria-label="선택지 참여자">
      {poll.anonymous ? <p className="text-muted-foreground">익명 투표로 참여자 정보를 표시하지 않습니다.</p> : active ? <><p className="mb-2 font-medium">{active.label} · {active.voters.length}명</p><div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">{active.voters.length ? active.voters.map((name, index) => <span key={index} className="rounded-md bg-muted px-2 py-1">{name}</span>) : <span className="text-muted-foreground">이 선택지에 참여한 사람이 없습니다.</span>}</div></> : <p className="text-muted-foreground">차트나 선택지에 커서를 올리거나 눌러 참여자를 확인하세요.</p>}
    </div>
    {poll.multiple_choice && <p className="text-[11px] leading-relaxed text-muted-foreground">다중 선택 투표입니다. 비율은 전체 선택 수를 기준으로 표시합니다.</p>}
  </section>;
}
