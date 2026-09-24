"use client";

import { useState } from "react";
import { Crown, Swords, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { currentStreak, longestStreak, recordTotals, relationRows, type PersonalMatch, type StatRole } from "@/lib/clan/stats/clan-stats-analytics";
import { HallOfFame } from "./clan-hall-of-fame";
import { StatsGauge, StatsTrend } from "./clan-stats-charts";
import { ClanStatsArchive } from "./clan-stats-archive";
import { mapDetailsForLabel } from "@/lib/balance/map-pools";
import { OW_HERO_PORTRAITS } from "@/lib/balance/ow-hero-portraits";

type StatPeriod = "all" | "month" | "year";
const ROLE_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "tank", label: "돌격" },
  { id: "dmg", label: "공격" },
  { id: "sup", label: "지원" },
] as const;
const ROLE_LABEL: Record<Exclude<StatRole, null>, string> = { tank: "돌격", dmg: "공격", sup: "지원" };
const RESULT_LABEL = { win: "승", draw: "무", loss: "패" } as const;

function rate(value: number | null) {
  return value === null ? "기록 없음" : `${value}%`;
}

function FilterButtons<T extends string>({ options, value, onChange, label }: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((option) => (
        <Button key={option.id} type="button" size="sm" variant={value === option.id ? "secondary" : "ghost"}
          aria-pressed={value === option.id} onClick={() => onChange(option.id)}>
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function IntraClanStats({ model }: { model: ClanStatsPageModel }) {
  const [metric, setMetric] = useState<"matches" | "sessions" | "participants">("matches");
  const [map, setMap] = useState<string | null>(null);
  const [mapType, setMapType] = useState("all");
  const [banRole, setBanRole] = useState("all");
  const [month, setMonth] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const stats = model.intra;
  const current = currentKstYearMonth();
  const monthly = new Map(stats.months.map((item) => [item.key, item]));
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(current.year, current.month - 12 + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return monthly.get(key) ?? { key, sessions: 0, matches: 0, participants: 0 };
  });
  const included = (date: string, mapName: string | null) =>
    (!map || mapName === map) && (!month || date.startsWith(month));
  const memberTerm = memberSearch.trim().toLocaleLowerCase("ko");
  const archive = !map && !month && !memberTerm ? model.archive : (() => {
    const sampleByDate = Object.fromEntries(Object.entries(model.archive.sampleByDate).map(([date, rows]) => [date, rows.filter((row) => included(date, row.mapLabel) && (!memberTerm || row.players.some((player) => player.nickname.toLocaleLowerCase("ko").includes(memberTerm))))]));
    return { datesKst: model.archive.datesKst.filter((date) => sampleByDate[date]?.length), sampleByDate };
  })();
  return (
    <div className="space-y-5">
      <div><h3 className="text-base font-bold">내전 통계</h3><p className="text-xs text-muted-foreground">정규 내전의 개최·경기·출석 기록입니다.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ["sessions", "개최 내전", stats.sessions, "열린 정규 내전"],
          ["matches", "완료 경기", stats.completed, "승·무·패 확정"],
          ["participants", "출전 멤버", stats.participants, "기간 내 고유 인원"],
        ] as const).map(([key, label, value, hint]) => (
          <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)} className={`rounded-xl border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary ${metric === key ? "border-primary/60 bg-primary/5" : ""}`}>
            <span className="block text-xs text-muted-foreground">{label}</span><strong className="mt-1 block text-3xl tabular-nums">{value}</strong><span className="block text-xs text-muted-foreground">{hint}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{key === "sessions" ? `내전 1회당 평균 ${stats.averageMatchesPerSession ?? "—"}경기` : key === "matches" ? `무승부 ${stats.draws}경기 · ${rate(stats.drawRate)}` : `내전 1회당 평균 ${stats.averageParticipantsPerSession ?? "—"}명`}</span>
          </button>
        ))}
      </div>
      <Card size="sm"><CardHeader><CardTitle>참여 추이</CardTitle><CardDescription>최근 12개월 · {metric === "sessions" ? "개최 내전" : metric === "matches" ? "완료 경기" : "월별 순출전 인원"}</CardDescription></CardHeader>
        <CardContent>
          {stats.sessions === 0 && stats.completed === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">집계할 내전 기록이 없습니다.</p> : (
            <StatsTrend points={months.map((item) => ({ key: item.key, value: item[metric] }))} selected={month} onSelect={(key) => setMonth(month === key ? null : key)} unit={metric === "participants" ? "명" : metric === "matches" ? "경기" : "회"} />
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm"><CardHeader><CardTitle>맵별 경기</CardTitle><CardDescription>전체 경기 중 맵 사용 비율 · 맵을 누르면 경기 기록을 좁힙니다.</CardDescription></CardHeader><CardContent className="space-y-2">
          <FilterButtons label="맵 유형" options={[{ id: "all", label: "전체" }, ...stats.mapTypes.map((row) => ({ id: row.name, label: ({ control: "쟁탈", push: "밀기", escort: "화물", hybrid: "혼합" } as Record<string, string>)[row.name] ?? row.name }))]} value={mapType} onChange={setMapType} />
          {map && <Button type="button" size="sm" variant="outline" onClick={() => setMap(null)}>맵 조건 해제: {map}</Button>}
          {stats.maps.filter((row) => mapType === "all" || mapDetailsForLabel(row.name)?.type === mapType).length ? stats.maps.filter((row) => mapType === "all" || mapDetailsForLabel(row.name)?.type === mapType).map((row) => <button key={row.name} type="button" onClick={() => setMap(map === row.name ? null : row.name)} aria-pressed={map === row.name} className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50"><span className="size-10 shrink-0 rounded-md bg-muted bg-cover bg-center" style={mapDetailsForLabel(row.name) ? { backgroundImage: `url(${mapDetailsForLabel(row.name)!.image})` } : undefined} aria-hidden="true" /><span className="min-w-0 flex-1 space-y-2"><span className="flex justify-between gap-2"><span className="truncate">{row.name}</span><strong className="shrink-0 text-xs tabular-nums">{row.matches} / {stats.completed}경기</strong></span><StatsGauge value={row.matches} total={stats.completed} label={`${row.name} 사용 ${row.matches} / 전체 ${stats.completed}경기`} /></span></button>) : <p className="text-sm text-muted-foreground">선택한 유형의 맵 기록이 없습니다.</p>}
        </CardContent></Card>
        <Card size="sm"><CardHeader><CardTitle>영웅 밴</CardTitle><CardDescription>최종 밴된 경기 수 · 투표 수와 구분</CardDescription></CardHeader><CardContent className="space-y-2">
          <FilterButtons label="영웅 역할" options={[{ id: "all", label: "전체" }, { id: "tank", label: "돌격" }, { id: "dps", label: "공격" }, { id: "support", label: "지원" }]} value={banRole} onChange={setBanRole} />
          <p className="text-xs text-muted-foreground">밴 사용 {stats.banEnabledMatches}경기 중 밴 없음 {stats.noBanMatches}경기</p>
          {stats.bans.filter((row) => banRole === "all" || row.role === banRole).length ? stats.bans.filter((row) => banRole === "all" || row.role === banRole).map((row) => <div key={row.hero} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"><span className="size-10 shrink-0 rounded-md bg-muted bg-cover bg-center" style={OW_HERO_PORTRAITS[row.hero] ? { backgroundImage: `url(${OW_HERO_PORTRAITS[row.hero]})` } : undefined} aria-hidden="true" /><span className="min-w-0 flex-1 space-y-2"><span className="flex justify-between gap-2"><span>{row.name}</span><strong className="shrink-0 text-xs tabular-nums">{row.matches} / {stats.completed}경기</strong></span><StatsGauge value={row.matches} total={stats.completed} label={`${row.name} 밴 ${row.matches} / 전체 ${stats.completed}경기`} /></span></div>) : <p className="text-sm text-muted-foreground">해당 역할의 확정 밴 기록이 없습니다.</p>}
        </CardContent></Card>
      </div>
      <Card size="sm"><CardHeader><CardTitle>맵 투표와 선정</CardTitle><CardDescription>후보 등장·투표 수·최종 선정은 서로 다른 단위입니다.</CardDescription></CardHeader><CardContent>
        {stats.mapVotes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-left">맵</th><th className="p-2 text-right">후보</th><th className="p-2 text-right">득표</th><th className="p-2 text-right">선정</th></tr></thead><tbody>{stats.mapVotes.map((row) => <tr key={row.name} className="border-b"><td className="p-2">{row.name}</td><td className="p-2 text-right">{row.candidates}회</td><td className="p-2 text-right">{row.votes}표</td><td className="p-2 text-right">{row.selected}경기</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">맵 투표 이력이 없습니다.</p>}
      </CardContent></Card>
      <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">경매 기록 · {stats.auction.lots}건 낙찰</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2"><h4 className="text-sm font-semibold">역할별 낙찰가</h4>{stats.auction.priceByRole.map((row) => <div key={row.role} className="flex justify-between rounded-lg border p-2 text-sm"><span>{({ tank: "돌격", dmg: "공격", sup: "지원", unknown: "역할 미상" } as Record<string, string>)[row.role] ?? row.role} · {row.lots}건</span><strong>평균 {row.average}pt</strong></div>)}{!stats.auction.lots && <p className="text-xs text-muted-foreground">보존된 낙찰 이력이 없습니다.</p>}
            <div className="grid grid-cols-4 gap-1.5">{["100pt 미만", "100~199pt", "200~399pt", "400pt 이상"].map((label, index) => <div key={label} className="rounded-lg bg-muted/30 p-2 text-center text-xs"><span className="block text-muted-foreground">{label}</span><strong>{stats.auction.priceRanges[index]}건</strong></div>)}</div>
          </div>
          <div className="space-y-2"><h4 className="text-sm font-semibold">예산과 전략 아이템</h4><p className="text-xs text-muted-foreground">보존된 낙찰·구매 로그만 집계합니다. 다른 경기의 예산은 섞어 비교하지 않습니다.</p><div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg border p-2">1팀 누적 낙찰액 <strong className="block">{stats.auction.teamSpend.team1}pt</strong></div><div className="rounded-lg border p-2">2팀 누적 낙찰액 <strong className="block">{stats.auction.teamSpend.team2}pt</strong></div></div>{stats.auction.budgetSnapshots > 0 && <p className="text-xs text-muted-foreground">완료 경매 {stats.auction.budgetSnapshots}회 잔액 합계: 1팀 {stats.auction.teamRemaining.team1}pt · 2팀 {stats.auction.teamRemaining.team2}pt</p>}{stats.auction.items.map((item) => <div key={item.name} className="flex justify-between rounded-lg border p-2 text-sm"><span>{item.name}</span><strong>{item.purchases}회 · {item.totalCost}pt</strong></div>)}{!stats.auction.items.length && <p className="text-xs text-muted-foreground">구매한 전략 아이템이 없습니다.</p>}</div>
        </div>
      </details>
      {model.permissions.viewMatchRecords ? <Card size="sm"><CardHeader><CardTitle>경기 기록</CardTitle><CardDescription>날짜를 선택해 양 팀과 결과를 확인하세요.</CardDescription></CardHeader><CardContent className="space-y-3">{(month || map) && <div className="flex flex-wrap gap-2">{month && <Button size="sm" variant="outline" onClick={() => setMonth(null)}>{month} 해제</Button>}{map && <Button size="sm" variant="outline" onClick={() => setMap(null)}>{map} 해제</Button>}</div>}<input aria-label="경기 참가자 검색" type="search" placeholder="참가자 이름 검색" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm sm:max-w-xs" /><ClanStatsArchive key={`${month ?? "all"}:${map ?? "all"}:${memberTerm}`} archive={archive} /></CardContent></Card> : <p className="text-xs text-muted-foreground">상세 경기 기록은 클랜의 경기 기록 열람 권한에 따라 제공됩니다.</p>}
    </div>
  );
}

function PersonalStats({ model, selectedId, onChoosePerson }: { model: ClanStatsPageModel; selectedId: string; onChoosePerson: (id: string) => void }) {
  const [period, setPeriod] = useState<StatPeriod>("all");
  const [role, setRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [peerRole, setPeerRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [relation, setRelation] = useState<"ally" | "enemy">("ally");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [relationSort, setRelationSort] = useState<"matches" | "wins" | "draws" | "losses" | "rate">("matches");
  const [relationDescending, setRelationDescending] = useState(true);
  const [mapSort, setMapSort] = useState<"matches" | "rate">("matches");
  const [scoreKind, setScoreKind] = useState<"evaluation" | "analysis">("evaluation");
  const [scoreMatchId, setScoreMatchId] = useState<string | null>(null);
  const [predictionFilter, setPredictionFilter] = useState<"all" | "correct" | "incorrect" | "draw" | "void">("all");
  const [participationMonth, setParticipationMonth] = useState<string | null>(null);
  const [participationDay, setParticipationDay] = useState<string | null>(null);
  const person = model.personal.people.find((candidate) => candidate.userId === selectedId) ?? model.personal.people[0];
  const now = currentKstYearMonth();
  const periodMatches = person.matches.filter((match) => period === "all" || (period === "year" ? match.date.startsWith(String(now.year)) : match.date.startsWith(`${now.year}-${String(now.month).padStart(2, "0")}`)));
  const matches = periodMatches.filter((match) => role === "all" || match.role === role);
  const totals = recordTotals(matches);
  const streak = currentStreak(person.matches);
  const bestWin = longestStreak(periodMatches, "win");
  const bestLoss = longestStreak(periodMatches, "loss");
  const relations = relationRows(periodMatches, role, peerRole, relation).sort((a, b) => {
    const value = (row: typeof a) => relationSort === "rate" ? row.wins / row.matches : row[relationSort];
    return (value(b) - value(a)) * (relationDescending ? 1 : -1) || a.nickname.localeCompare(b.nickname, "ko");
  });
  const sortRelation = (key: typeof relationSort) => {
    if (key === relationSort) setRelationDescending((current) => !current);
    else { setRelationSort(key); setRelationDescending(true); }
  };
  const mapGroups = new Map<string, PersonalMatch[]>();
  for (const match of matches) {
    if (!match.map) continue;
    if (!mapGroups.has(match.map)) mapGroups.set(match.map, []);
    mapGroups.get(match.map)!.push(match);
  }
  const maps = [...mapGroups].map(([name, rows]) => ({ name, ...recordTotals(rows) })).sort((a, b) => mapSort === "matches" ? b.matches - a.matches : (b.rate ?? -1) - (a.rate ?? -1));
  const selectedPeer = relations.find((row) => row.id === peerId);
  const roleRows = ROLE_OPTIONS.filter((option) => option.id !== "all").map((option) => ({ ...option, ...recordTotals(periodMatches.filter((match) => match.role === option.id)) }));
  const scoreRows = [...matches].reverse().filter((match) => match[scoreKind] !== null);
  const scoreValues = scoreRows.map((match) => match[scoreKind]!);
  const scoreMin = scoreValues.length ? Math.min(...scoreValues) : 0;
  const scoreMax = scoreValues.length ? Math.max(...scoreValues) : 0;
  const scorePoints = scoreRows.map((match, index) => ({ match, x: scoreRows.length === 1 ? 50 : 5 + index * 90 / (scoreRows.length - 1), y: scoreMin === scoreMax ? 50 : 90 - (match[scoreKind]! - scoreMin) * 80 / (scoreMax - scoreMin) }));
  const selectedScore = scoreRows.find((match) => match.id === scoreMatchId);
  const periodPredictions = person.predictions.filter((item) => period === "all" || (period === "year" ? item.date.startsWith(String(now.year)) : item.date.startsWith(`${now.year}-${String(now.month).padStart(2, "0")}`)));
  const validPredictions = periodPredictions.filter((item) => item.result === "correct" || item.result === "incorrect");
  const correctPredictions = validPredictions.filter((item) => item.result === "correct").length;
  const visiblePredictions = periodPredictions.filter((item) => predictionFilter === "all" || item.result === predictionFilter).slice(0, 20);
  const monthKey = participationMonth ?? periodMatches[0]?.date.slice(0, 7) ?? `${now.year}-${String(now.month).padStart(2, "0")}`;
  const monthDays = new Map<string, PersonalMatch[]>();
  for (const match of periodMatches.filter((item) => item.date.startsWith(monthKey))) {
    if (!monthDays.has(match.date)) monthDays.set(match.date, []);
    monthDays.get(match.date)!.push(match);
  }
  const selectedDayMatches = participationDay ? monthDays.get(participationDay) ?? [] : [];
  const awards = (["all", "month", "year"] as const).flatMap((key) => {
    const block = model.hof.periods[key];
    if (block.undisclosed) return [];
    const label = key === "all" ? "전체" : key === "month" ? "이번 달" : "올해";
    return ([
      ["승률", block.winRate], ["최다 출석", block.participation], ["경기 출전", block.cumulative], ["최장 연승", block.streaks], ["승부예측 적중", block.predictionCorrect],
    ] as const).flatMap(([category, rows]) => {
      const index = rows.findIndex((row) => row.userId === person.userId);
      return index < 0 ? [] : [`${label} ${category} ${index + 1}위`];
    });
  });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold">개인 기록 · {person.nickname}</h3><p className="text-xs text-muted-foreground">정규 내전에서 실제 출전한 경기만 집계합니다.</p></div>
        {model.personal.people.length > 1 && <select aria-label="기록을 볼 멤버" value={person.userId} onChange={(event) => onChoosePerson(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">{model.personal.people.map((item) => <option key={item.userId} value={item.userId}>{item.nickname}</option>)}</select>}
      </div>
      <FilterButtons label="개인 기록 기간" options={[{ id: "all", label: "전체" }, { id: "month", label: "이번 달" }, { id: "year", label: "올해" }]} value={period} onChange={setPeriod} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm"><CardHeader><CardDescription>출전 경기</CardDescription><CardTitle className="text-2xl tabular-nums">{totals.matches}경기</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">참여 내전 {totals.sessions}회 · 내전 정보가 없는 경기 제외</CardContent></Card>
        <Card size="sm"><CardHeader><CardDescription>승 · 무 · 패</CardDescription><CardTitle className="text-xl tabular-nums">{totals.wins}승 {totals.draws}무 {totals.losses}패</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">무효·결과 미정 제외</CardContent></Card>
        <Card size="sm"><CardHeader><CardDescription>승률</CardDescription><CardTitle className="text-2xl tabular-nums">{rate(totals.rate)}</CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-muted-foreground"><StatsGauge value={totals.wins} total={totals.matches} label={`승률 ${rate(totals.rate)} · ${totals.wins}승 / ${totals.matches}경기`} /><span>승 ÷ (승 + 무 + 패)</span></CardContent></Card>
      </div>
      <Card size="sm"><CardHeader><CardTitle>최근 흐름</CardTitle><CardDescription>현재 연속은 선택 기간과 관계없이 최신 전체 경기 기준입니다.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-1.5">{person.matches.slice(0, 10).map((match) => <span key={match.id} title={`${match.date} ${match.map ?? "맵 미기록"}`} className={`rounded px-2 py-1 text-xs ${match.result === "win" ? "bg-sky-500/15 text-sky-400" : match.result === "loss" ? "bg-rose-500/15 text-rose-400" : "bg-muted"}`}>{RESULT_LABEL[match.result]}</span>)}{!person.matches.length && <span className="text-sm text-muted-foreground">기록 없음</span>}</div><p className="text-sm font-semibold">{streak.count ? `${streak.count}연${streak.result === "win" ? "승" : "패"}` : "현재 연속 기록 없음"}</p></CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-2">{([{ label: "최장 연승", row: bestWin }, { label: "최장 연패", row: bestLoss }] as const).map(({ label, row }) => <Card key={label} size="sm"><CardHeader><CardDescription>{label} · 선택 기간</CardDescription><CardTitle className="text-xl">{row.count ? `${row.count}경기` : "기록 없음"}</CardTitle></CardHeader>{row.count > 0 && <CardContent className="text-xs text-muted-foreground">{row.start} ~ {row.end}</CardContent>}</Card>)}</div>
      <Card size="sm"><CardHeader><CardTitle>역할별 기록</CardTitle><CardDescription>역할을 선택하면 아래 기록에도 적용됩니다.</CardDescription></CardHeader><CardContent className="space-y-2"><FilterButtons label="내 역할" options={ROLE_OPTIONS} value={role} onChange={(value) => { setRole(value); setPeerId(null); }} />
        {roleRows.map((row) => <button key={row.id} type="button" onClick={() => setRole(row.id)} className="w-full space-y-2 rounded-lg border p-3 text-left text-sm hover:bg-muted/50"><span className="flex justify-between gap-2"><span>{row.label}</span><span>{row.matches}경기 · {rate(row.rate)}</span></span><StatsGauge value={row.wins} total={row.matches} label={`${row.label} 승률 ${rate(row.rate)} · ${row.wins}승 ${row.draws}무 ${row.losses}패`} /></button>)}
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle>함께한 기록 · 상대 전적</CardTitle><CardDescription>내 역할과 상대 역할, 팀 관계를 함께 선택합니다.</CardDescription></CardHeader><CardContent className="space-y-4">
        {model.personal.canSeePeers ? <>
          <FilterButtons label="팀 관계" options={[{ id: "ally", label: "같은 팀" }, { id: "enemy", label: "상대 팀" }]} value={relation} onChange={(value) => { setRelation(value); setPeerId(null); }} />
          <div><p className="mb-1 text-xs text-muted-foreground">상대 역할</p><FilterButtons label="상대 역할" options={ROLE_OPTIONS} value={peerRole} onChange={(value) => { setPeerRole(value); setPeerId(null); }} /></div>
          <p className="text-xs text-muted-foreground">{role === "all" ? "모든 역할" : ROLE_LABEL[role!]}로 출전했을 때, {relation === "ally" ? "같은 팀" : "상대 팀"} {peerRole === "all" ? "모든 역할" : ROLE_LABEL[peerRole!]} 멤버와의 기록입니다. 승률은 {person.nickname} 관점입니다.</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-left">멤버</th>{([{ key: "matches", label: "경기" }, { key: "wins", label: "승" }, { key: "draws", label: "무" }, { key: "losses", label: "패" }, { key: "rate", label: "승률" }] as const).map(({ key, label }) => <th key={key} className="p-2 text-right" aria-sort={relationSort === key ? relationDescending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => sortRelation(key)} className="hover:text-foreground">{label}{relationSort === key ? relationDescending ? " ↓" : " ↑" : ""}</button></th>)}</tr></thead><tbody>{relations.map((row) => <tr key={row.id} className="border-b"><td className="p-2"><button type="button" className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setPeerId(peerId === row.id ? null : row.id)}>{row.nickname}</button></td><td className="p-2 text-right">{row.matches}</td><td className="p-2 text-right">{row.wins}</td><td className="p-2 text-right">{row.draws}</td><td className="p-2 text-right">{row.losses}</td><td className="p-2 text-right">{Math.round(row.wins / row.matches * 1000) / 10}%</td></tr>)}</tbody></table>{relations.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">해당 역할 조합의 기록이 없습니다.</p>}</div>
          {selectedPeer && <div className="rounded-lg border p-3"><p className="text-sm font-semibold">{selectedPeer.nickname}와의 근거 경기 · {selectedPeer.matches}경기</p><p className="mt-1 text-xs text-muted-foreground">{model.permissions.viewMatchRecords ? "아래 경기 기록에서 날짜와 양 팀을 확인할 수 있습니다." : "경기 상세는 경기 기록 열람 권한이 필요합니다."}</p><p className="mt-2 text-xs">{periodMatches.filter((match) => selectedPeer.matchIds.includes(match.id)).map((match) => `${match.date} ${RESULT_LABEL[match.result]}`).join(" · ")}</p></div>}
          <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">역할 조합표 보기</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[400px] text-xs"><thead><tr><th className="p-2 text-left">내 역할 / 상대 역할</th>{ROLE_OPTIONS.slice(1).map((item) => <th key={item.id} className="p-2">{item.label}</th>)}</tr></thead><tbody>{ROLE_OPTIONS.slice(1).map((own) => <tr key={own.id} className="border-t"><th className="p-2 text-left">{own.label}</th>{ROLE_OPTIONS.slice(1).map((peer) => { const rows = relationRows(periodMatches, own.id, peer.id, relation); const ids = new Set(rows.flatMap((row) => row.matchIds)); const sample = periodMatches.filter((match) => ids.has(match.id)); const total = recordTotals(sample); return <td key={peer.id} className="p-1 text-center"><button type="button" onClick={() => { setRole(own.id); setPeerRole(peer.id); setPeerId(null); }} className="w-full rounded-lg border p-2 hover:bg-muted/50">{total.matches ? <>{rate(total.rate)}<span className="block text-muted-foreground">{total.matches}경기</span></> : "—"}</button></td>; })}</tr>)}</tbody></table></div><p className="mt-2 text-xs text-muted-foreground">한 경기에서 같은 역할의 상대를 여러 명 만나도 조합 칸에는 한 경기로 셉니다.</p></details>
        </> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">상대별 전적은 클랜의 관계 통계 열람 권한에 따라 제공됩니다.</p>}
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle>맵별 기록</CardTitle><CardDescription>맵이 저장된 경기만 표시합니다.</CardDescription></CardHeader><CardContent className="space-y-2"><FilterButtons label="맵 정렬" options={[{ id: "matches", label: "출전순" }, { id: "rate", label: "승률순" }]} value={mapSort} onChange={setMapSort} />{maps.map((row) => <div key={row.name} className="space-y-2 rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><span>{row.name}</span><span>{row.matches}경기 · {rate(row.rate)}</span></div><StatsGauge value={row.wins} total={row.matches} label={`${row.name} 승률 ${rate(row.rate)}`} /></div>)}{maps.length === 0 && <p className="text-sm text-muted-foreground">맵 기록이 없습니다.</p>}</CardContent></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm"><CardHeader><CardTitle>참여 날짜</CardTitle><CardDescription>날짜를 선택해 참여 내전과 경기를 확인합니다.</CardDescription></CardHeader><CardContent className="space-y-3"><input aria-label="참여 기록 월" type="month" value={monthKey} onChange={(event) => { setParticipationMonth(event.target.value); setParticipationDay(null); }} className="rounded-lg border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-7 gap-1.5">{Array.from({ length: Number(monthKey.slice(0, 4)) && Number(monthKey.slice(5, 7)) ? new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0).getDate() : 0 }, (_, index) => { const date = `${monthKey}-${String(index + 1).padStart(2, "0")}`; const rows = monthDays.get(date) ?? []; return <button key={date} type="button" onClick={() => setParticipationDay(date)} aria-pressed={participationDay === date} aria-label={`${date}, ${rows.length}경기`} className={`rounded-lg border p-1.5 text-xs ${rows.length ? "bg-primary/15" : "text-muted-foreground"} ${participationDay === date ? "border-primary" : ""}`}>{index + 1}</button>; })}</div>
          {participationDay && <p className="text-xs text-muted-foreground">{participationDay}: {selectedDayMatches.length}경기 · {new Set(selectedDayMatches.map((match) => match.seriesId).filter(Boolean)).size}회</p>}
        </CardContent></Card>
        <Card size="sm"><CardHeader><CardTitle>점수 이력</CardTitle><CardDescription>경기 당시 저장된 평가·분석 점수</CardDescription></CardHeader><CardContent className="space-y-3"><FilterButtons label="점수 종류" options={[{ id: "evaluation", label: "평가 점수" }, { id: "analysis", label: "분석 점수" }]} value={scoreKind} onChange={(value) => { setScoreKind(value); setScoreMatchId(null); }} />
          {scoreRows.length ? <><svg viewBox="0 0 100 100" role="img" aria-label={`${scoreKind === "evaluation" ? "평가" : "분석"} 점수 ${scoreRows.length}경기 변화`} className="h-32 w-full overflow-visible"><polyline fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" points={scorePoints.map((point) => `${point.x},${point.y}`).join(" ")} />{scorePoints.map((point) => <circle key={point.match.id} cx={point.x} cy={point.y} r="2" fill="currentColor" />)}</svg><div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">{scoreRows.map((match) => <Button key={match.id} type="button" size="sm" variant={scoreMatchId === match.id ? "secondary" : "ghost"} onClick={() => setScoreMatchId(match.id)}>{match.date} {match[scoreKind]}점</Button>)}</div>{selectedScore && <p className="text-xs text-muted-foreground">{selectedScore.date} · {selectedScore.map ?? "맵 미기록"} · {selectedScore[scoreKind]}점</p>}</> : <p className="text-sm text-muted-foreground">저장된 점수 이력이 없습니다.</p>}
        </CardContent></Card>
      </div>
      {person.userId === model.personal.viewerId && <Card size="sm"><CardHeader><CardTitle>내 승부예측</CardTitle><CardDescription>적중·실패로 확정된 예측만 적중률에 포함합니다.</CardDescription></CardHeader><CardContent className="space-y-3">
        <p className="text-sm"><strong className="text-xl tabular-nums">{validPredictions.length ? `${Math.round(correctPredictions / validPredictions.length * 1000) / 10}%` : "기록 없음"}</strong><span className="ml-2 text-xs text-muted-foreground">{correctPredictions}회 적중 / {validPredictions.length}회 유효</span></p>
        <StatsGauge value={correctPredictions} total={validPredictions.length} label={`${validPredictions.length}회 예측 중 ${correctPredictions}회 적중`} />
        <FilterButtons label="승부예측 결과" options={[{ id: "all", label: "전체" }, { id: "correct", label: "적중" }, { id: "incorrect", label: "실패" }, { id: "draw", label: "무승부" }, { id: "void", label: "무효" }]} value={predictionFilter} onChange={setPredictionFilter} />
        {visiblePredictions.map((item) => <div key={item.sessionId} className="flex justify-between rounded-lg border p-3 text-sm"><span>{item.date} · {item.map ?? "맵 미기록"}</span><strong>{({ correct: "적중", incorrect: "실패", draw: "무승부 · 보상 없음", void: "무효 · 보상 없음" } as const)[item.result]}</strong></div>)}
        {!visiblePredictions.length && <p className="text-sm text-muted-foreground">조건에 맞는 예측 기록이 없습니다.</p>}
      </CardContent></Card>}
      <Card size="sm"><CardHeader><CardTitle>명예의 전당 등재</CardTitle><CardDescription>현재 조회 가능한 기간·부문 기준</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{awards.length ? awards.map((award) => <Badge key={award} variant="secondary">{award}</Badge>) : <p className="text-sm text-muted-foreground">조회 가능한 등재 기록이 없습니다.</p>}</CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle>출전 경기</CardTitle><CardDescription>선택 기간·역할 조건을 적용한 최근 기록입니다.</CardDescription></CardHeader><CardContent className="space-y-2">{matches.slice(0, 30).map((match) => <div key={match.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{match.date} · {match.map ?? "맵 미기록"} · {match.role ? ROLE_LABEL[match.role] : "역할 미상"}</span><strong>{RESULT_LABEL[match.result]}</strong></div>)}{!matches.length && <p className="text-sm text-muted-foreground">조건에 맞는 출전 기록이 없습니다.</p>}</CardContent></Card>
    </div>
  );
}

export function ClanStatsExperience({ gameSlug, clanId, model }: { gameSlug: string; clanId: string; model: ClanStatsPageModel }) {
  const [tab, setTab] = useState("hof");
  const [personId, setPersonId] = useState(model.personal.viewerId);
  const choosePerson = (id: string) => {
    if (!model.personal.people.some((person) => person.userId === id)) return;
    setPersonId(id);
    setTab("personal");
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight">클랜 통계</h2><p className="mt-1 text-xs text-muted-foreground">주요 기록을 살펴보고 실제 내전 경기로 이어서 확인하세요.</p></div>{model.hof.exposeHof && <Badge variant="secondary">명예의 전당 공개 중</Badge>}</div>
    <Tabs value={tab} onValueChange={setTab} className="w-full"><TabsList variant="line" className="mb-4 h-auto w-full justify-start gap-3 border-b sm:gap-6"><TabsTrigger value="hof"><Crown className="size-4" aria-hidden="true" /> 명예의 전당</TabsTrigger><TabsTrigger value="intra"><Swords className="size-4" aria-hidden="true" /> 내전 통계</TabsTrigger><TabsTrigger value="personal"><UserRound className="size-4" aria-hidden="true" /> 개인 기록</TabsTrigger></TabsList>
      <TabsContent value="hof"><HallOfFame model={model} gameSlug={gameSlug} clanId={clanId} onChoosePerson={choosePerson} /></TabsContent>
      <TabsContent value="intra"><IntraClanStats model={model} /></TabsContent>
      <TabsContent value="personal"><PersonalStats model={model} selectedId={personId} onChoosePerson={setPersonId} /></TabsContent>
    </Tabs>
  </div>;
}
