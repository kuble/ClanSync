"use client";

import { useTranslator } from "#use-translator";
import { useState, type ReactNode } from "react";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RubberSegment } from "@/components/ui/rubber-segment";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { StatsScrollArea } from "./stats-scroll-area";

export function StatsMemberPicker({ people, onSelect, settings }: { settings?: ReactNode; people: (Pick<ClanStatsPageModel["personal"]["people"][number], "userId" | "nickname" | "lastPlayedAt"> & { matches?: ClanStatsPageModel["personal"]["people"][number]["matches"] })[]; onSelect: (id: string) => void }) {
  const tx = useTranslator();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const visible = people.filter((person) => person.nickname.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    const latest = (person: typeof a) => person.lastPlayedAt !== undefined
      ? person.lastPlayedAt ? Date.parse(person.lastPlayedAt) : 0
      : (person.matches ?? []).reduce((time, match) => Math.max(time, Date.parse(match.occurredAt)), 0);
    return (sort === "recent" ? latest(b) - latest(a) : 0) || a.nickname.localeCompare(b.nickname, "ko");
  });
  return <section className="space-y-4" aria-label={tx("개인 기록 멤버 선택")}>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="relative min-w-0 sm:max-w-sm sm:flex-1"><Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={tx("멤버 이름 검색")} placeholder={tx("멤버 이름 검색")} value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" /></div>
      <div className="flex min-w-0 items-center justify-between gap-2 sm:ml-auto">
        <RubberSegment label={tx("멤버 정렬")} labelPosition="hidden" options={[{ id: "recent", label: "최근 출전순" }, { id: "name", label: "이름순" }]} value={sort} onChange={setSort} />
        {settings}
      </div>
    </div>
    <StatsScrollArea label={tx("개인 기록 멤버 목록")} className="max-h-[min(32rem,60vh)]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visible.map((person) => <button key={person.userId} type="button" onClick={() => onSelect(person.userId)} aria-label={tx("{0} 개인 기록 열기", person.nickname)}
        className="flex min-h-16 min-w-0 items-center gap-2 rounded-xl border bg-card px-3 py-3 text-left text-sm font-semibold hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary">
        <UserRound aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="truncate" title={person.nickname}>{person.nickname}</span>
      </button>)}</div>
      {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">{tx("검색 결과가 없습니다.")}</p>}
    </StatsScrollArea>
  </section>;
}
