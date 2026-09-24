"use client";

import { useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OptionWheel } from "@/components/ui/option-wheel";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { StatsScrollArea } from "./stats-scroll-area";

export function StatsMemberPicker({ people, onSelect }: { people: ClanStatsPageModel["personal"]["people"]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const visible = people.filter((person) => person.nickname.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    const latest = (person: typeof a) => person.matches.reduce((time, match) => Math.max(time, Date.parse(match.occurredAt)), 0);
    return (sort === "recent" ? latest(b) - latest(a) : 0) || a.nickname.localeCompare(b.nickname, "ko");
  });
  return <section className="space-y-4" aria-label="개인 기록 멤버 선택">
    <h3 className="text-lg font-bold">멤버를 선택하세요</h3>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative min-w-0 flex-1 sm:max-w-sm"><Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="멤버 이름 검색" placeholder="멤버 이름 검색" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" /></div>
      <OptionWheel label="멤버 정렬" options={[{ id: "recent", label: "최근 출전순" }, { id: "name", label: "이름순" }]} value={sort} onChange={setSort} />
    </div>
    <StatsScrollArea label="개인 기록 멤버 목록" className="max-h-[min(32rem,60vh)]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{visible.map((person) => <button key={person.userId} type="button" onClick={() => onSelect(person.userId)} aria-label={`${person.nickname} 개인 기록 열기`}
        className="flex min-h-16 min-w-0 items-center gap-2 rounded-xl border bg-card px-3 py-3 text-left text-sm font-semibold hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary">
        <UserRound aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="truncate" title={person.nickname}>{person.nickname}</span>
      </button>)}</div>
      {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
    </StatsScrollArea>
  </section>;
}
