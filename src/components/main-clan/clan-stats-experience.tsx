"use client";

import { useState, type ReactNode } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle, StatHelp } from "./stat-help";
import { StatsEmblems } from "./stats-emblems";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatsMemberPicker } from "./stats-member-picker";
import { StatsTimeChart } from "./stats-time-chart";
import { Crown, Swords, UserRound, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { currentStreak, longestStreak, recordTotals, relationRows, type PersonalMatch, type StatRole } from "@/lib/clan/stats/clan-stats-analytics";
import { HallOfFame } from "./clan-hall-of-fame";
import { StatsGauge } from "./clan-stats-charts";
import { IntraClanStats } from "./clan-intra-stats";
import { ClanMatchHistory } from "./clan-match-history";

import { StatsPeriodFilter } from "./stats-period-filter";
import { statsPeriodKey, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
const ROLE_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "tank", label: "돌격", icon: <OverwatchRoleIcon role="tank" /> },
  { id: "dmg", label: "공격", icon: <OverwatchRoleIcon role="damage" /> },
  { id: "sup", label: "지원", icon: <OverwatchRoleIcon role="support" /> },
] as const;
const ROLE_LABEL: Record<Exclude<StatRole, null>, string> = { tank: "돌격", dmg: "공격", sup: "지원" };
const RESULT_LABEL = { win: "승", draw: "무", loss: "패" } as const;

function rate(value: number | null) {
  return value === null ? "기록 없음" : `${value}%`;
}

function FilterButtons<T extends string>({ options, value, onChange, label }: {
  options: readonly { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return <RubberSegment options={options} value={value} onChange={onChange} label={label} labelPosition="top" />;
}

function PersonalStats({ model, selectedId, onBack }: { model: ClanStatsPageModel; selectedId: string; onBack: () => void }) {
  const now = currentKstYearMonth();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const [role, setRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [peerRole, setPeerRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [relation, setRelation] = useState<"ally" | "enemy">("ally");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [relationSort, setRelationSort] = useState<"matches" | "wins" | "draws" | "losses" | "rate">("matches");
  const [relationDescending, setRelationDescending] = useState(true);
  const [mapSort, setMapSort] = useState<"matches" | "rate">("matches");
  const [scoreKind, setScoreKind] = useState<"evaluation" | "analysis">("evaluation");
  const person = model.personal.people.find((candidate) => candidate.userId === selectedId) ?? model.personal.people[0];
  const years = [...new Set([String(now.year), ...person.matches.map((match) => match.date.slice(0, 4)), ...person.predictionPoints.map((day) => day.date.slice(0, 4))])].sort().reverse();
  const periodKey = statsPeriodKey(period);
  const inPeriod = (date: string) => periodKey === "all" || date.startsWith(periodKey);
  const periodMatches = person.matches.filter((match) => inPeriod(match.date));
  const matches = periodMatches;
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
  const roleRows = ROLE_OPTIONS.map((option) => ({ ...option, ...recordTotals(periodMatches.filter((match) => option.id === "all" || match.role === option.id)) }));
  const scorePoints = [...matches].reverse().map((match) => ({ at: match.occurredAt, value: match[scoreKind] }));
  const predictionDays = person.predictionPoints.filter((item) => inPeriod(item.date));
  const earned = predictionDays.reduce((sum, day) => sum + day.earned, 0);
  const lost = predictionDays.reduce((sum, day) => sum + day.lost, 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="text-base font-bold"><StatTitle title={`개인 기록 · ${person.nickname}`} help="정규 내전에서 실제 출전한 경기만 집계합니다." /></h3></div>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>멤버 다시 선택</Button>
      </div>
      <section aria-label="개인 기록 기간"><StatsPeriodFilter value={period} onChange={(next) => { setPeriod(next); setPeerId(null); }} years={years} /></section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm"><CardHeader><CardDescription><StatTitle title="출전 경기" help="선택 기간의 실제 출전 경기 수입니다. 참여 내전 횟수에는 내전 정보가 없는 과거 경기를 제외합니다." /></CardDescription><CardTitle className="text-2xl tabular-nums">{totals.matches}경기</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">참여 내전 {totals.sessions}회</CardContent></Card>
        <Card size="sm"><CardHeader><CardDescription><StatTitle title="승/무/패" help="무효·결과 미정은 제외합니다." /></CardDescription><CardTitle className="text-xl tabular-nums">{totals.wins}승 / {totals.draws}무 / {totals.losses}패</CardTitle></CardHeader></Card>
        <Card size="sm" className="relative isolate"><CardHeader><CardDescription><StatTitle title="승률" help="승 ÷ (승 + 무 + 패). 무승부도 분모에 포함합니다." /></CardDescription><CardTitle className="text-2xl tabular-nums">{rate(totals.rate)}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground"><StatsGauge value={totals.wins} total={totals.matches} label={`승률 ${rate(totals.rate)} · ${totals.wins}승 / ${totals.matches}경기`} /></CardContent></Card>
      </div>
      <Card size="sm"><CardHeader><CardTitle><span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span>최근 흐름</span><span className={`text-xs font-medium ${streak.count ? streak.result === "win" ? "text-sky-400" : "text-rose-400" : "text-muted-foreground"}`}>{streak.count ? `${streak.count}연${streak.result === "win" ? "승" : "패"}` : "현재 연속 기록 없음"}</span><StatHelp title="최근 흐름">현재 연속은 선택 기간과 관계없이 최신 전체 경기 기준입니다.</StatHelp></span></CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-1.5">{person.matches.slice(0, 10).map((match) => <span key={match.id} title={`${match.date} ${match.map ?? "맵 미기록"}`} className={`rounded px-2 py-1 text-xs ${match.result === "win" ? "bg-sky-500/15 text-sky-400" : match.result === "loss" ? "bg-rose-500/15 text-rose-400" : "bg-muted"}`}>{RESULT_LABEL[match.result]}</span>)}{!person.matches.length && <span className="text-sm text-muted-foreground">기록 없음</span>}</div></CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-2">{([{ label: "최장 연승", row: bestWin }, { label: "최장 연패", row: bestLoss }] as const).map(({ label, row }) => <Card key={label} size="sm"><CardHeader><CardDescription><StatTitle title={label} help="선택한 기간 안에서 이어진 최장 연속 기록입니다." /></CardDescription><CardTitle className="text-xl">{row.count ? `${row.count}경기` : "기록 없음"}</CardTitle></CardHeader>{row.count > 0 && <CardContent className="text-xs text-muted-foreground">{row.start} ~ {row.end}</CardContent>}</Card>)}</div>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="역할별 기록" help="선택 기간의 전체·돌격·공격·지원 기록을 함께 비교합니다. 시너지 역할 조건은 이 기록에 영향을 주지 않습니다." /></CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3" aria-label="역할별 기록 비교">{roleRows.map((row) => <div key={row.id} className="relative isolate min-w-0 overflow-hidden rounded-lg border px-1.5 py-3 text-center sm:px-3">
          <p className="text-xs font-medium">{row.label}</p><p className="mt-2 text-base font-bold tabular-nums sm:text-xl">{rate(row.rate)}</p><p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{row.matches}경기</p>
          <StatsGauge value={row.wins} total={row.matches} label={row.label + " 승률 " + rate(row.rate) + " · " + row.wins + "승 / " + row.draws + "무 / " + row.losses + "패"} />
        </div>)}</div>
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="시너지" help={<>내 역할과 상대 역할, 팀 관계를 함께 선택합니다.</>} /></CardTitle></CardHeader><CardContent className="space-y-4">
        {model.personal.canSeePeers ? <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><FilterButtons label="내 역할" options={ROLE_OPTIONS} value={role} onChange={(value) => { setRole(value); setPeerId(null); }} /><FilterButtons label="팀 관계" options={[{ id: "ally", label: "같은 팀" }, { id: "enemy", label: "상대 팀" }]} value={relation} onChange={(value) => { setRelation(value); setPeerId(null); }} />
          <div><FilterButtons label="상대 역할" options={ROLE_OPTIONS} value={peerRole} onChange={(value) => { setPeerRole(value); setPeerId(null); }} /></div></div>
          <p className="text-xs text-muted-foreground">{role === "all" ? "모든 역할" : ROLE_LABEL[role!]}로 출전했을 때, {relation === "ally" ? "같은 팀" : "상대 팀"} {peerRole === "all" ? "모든 역할" : ROLE_LABEL[peerRole!]} 멤버와의 기록입니다. 승률은 {person.nickname} 관점입니다.</p>
          <StatsScrollArea label="시너지 기록 목록" className="max-h-80"><div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><table className="w-full min-w-[540px] text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2 text-left">멤버</th>{([{ key: "matches", label: "경기" }, { key: "wins", label: "승" }, { key: "draws", label: "무" }, { key: "losses", label: "패" }, { key: "rate", label: "승률" }] as const).map(({ key, label }) => <th key={key} className="p-2 text-right" aria-sort={relationSort === key ? relationDescending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => sortRelation(key)} className="hover:text-foreground">{label}{relationSort === key ? relationDescending ? " ↓" : " ↑" : ""}</button></th>)}</tr></thead><tbody>{relations.map((row) => <tr key={row.id} className="border-b"><td className="p-2"><button type="button" className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setPeerId(peerId === row.id ? null : row.id)}>{row.nickname}</button></td><td className="p-2 text-right">{row.matches}</td><td className="p-2 text-right">{row.wins}</td><td className="p-2 text-right">{row.draws}</td><td className="p-2 text-right">{row.losses}</td><td className="p-2 text-right">{Math.round(row.wins / row.matches * 1000) / 10}%</td></tr>)}</tbody></table>{relations.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">해당 역할 조합의 기록이 없습니다.</p>}</div>
          {selectedPeer && <div className="rounded-lg border p-3"><p className="text-sm font-semibold">{selectedPeer.nickname}와의 근거 경기 · {selectedPeer.matches}경기</p><p className="mt-1 text-xs text-muted-foreground">{model.permissions.viewMatchRecords ? "내전 통계의 경기 기록에서 날짜와 양 팀을 확인할 수 있습니다." : "경기 상세는 경기 기록 열람 권한이 필요합니다."}</p><p className="mt-2 text-xs">{periodMatches.filter((match) => selectedPeer.matchIds.includes(match.id)).map((match) => `${match.date} ${RESULT_LABEL[match.result]}`).join(" · ")}</p></div>}
          <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">역할 조합표 보기</summary><div className="mt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><table className="w-full min-w-[400px] text-xs"><thead><tr><th className="p-2 text-left">내 역할 / 상대 역할</th>{ROLE_OPTIONS.slice(1).map((item) => <th key={item.id} className="p-2">{item.label}</th>)}</tr></thead><tbody>{ROLE_OPTIONS.slice(1).map((own) => <tr key={own.id} className="border-t"><th className="p-2 text-left">{own.label}</th>{ROLE_OPTIONS.slice(1).map((peer) => { const rows = relationRows(periodMatches, own.id, peer.id, relation); const ids = new Set(rows.flatMap((row) => row.matchIds)); const sample = periodMatches.filter((match) => ids.has(match.id)); const total = recordTotals(sample); return <td key={peer.id} className="p-1 text-center"><button type="button" onClick={() => { setRole(own.id); setPeerRole(peer.id); setPeerId(null); }} className="w-full rounded-lg border p-2 hover:bg-muted/50">{total.matches ? <>{rate(total.rate)}<span className="block text-muted-foreground">{total.matches}경기</span></> : "—"}</button></td>; })}</tr>)}</tbody></table></div><p className="mt-2 text-xs text-muted-foreground">한 경기에서 같은 역할의 상대를 여러 명 만나도 조합 칸에는 한 경기로 셉니다.</p></details></StatsScrollArea>
        </> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">상대별 전적은 클랜의 관계 통계 열람 권한에 따라 제공됩니다.</p>}
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="맵별 기록" help={<>맵이 저장된 경기만 표시합니다.</>} /></CardTitle></CardHeader><CardContent className="space-y-2"><FilterButtons label="맵 정렬" options={[{ id: "matches", label: "출전순" }, { id: "rate", label: "승률순" }]} value={mapSort} onChange={setMapSort} /><StatsScrollArea label="맵별 기록 목록">{maps.map((row) => <div key={row.name} className="relative isolate overflow-hidden rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><span>{row.name}</span><span>{row.matches}경기 · {rate(row.rate)}</span></div><StatsGauge value={row.wins} total={row.matches} label={`${row.name} 승률 ${rate(row.rate)}`} /></div>)}{maps.length === 0 && <p className="text-sm text-muted-foreground">맵 기록이 없습니다.</p>}</StatsScrollArea></CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="점수 이력" help="경기 당시 저장된 점수를 실제 경기 날짜 순서로 표시합니다. 선 위에 마우스를 올리거나 방향키로 날짜별 값을 확인하세요. 저장되지 않은 점수는 연결하지 않습니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
        <FilterButtons label="점수 종류" options={[{ id: "evaluation", label: "평가 점수" }, { id: "analysis", label: "분석 점수" }]} value={scoreKind} onChange={setScoreKind} />
        <StatsTimeChart key={scoreKind} label="점수 이력 그래프" unit="점" lines={[{ label: scoreKind === "evaluation" ? "평가 점수" : "분석 점수", color: "var(--primary)", points: scorePoints }]} empty="저장된 점수 이력이 없습니다." />
      </CardContent></Card>
      {person.userId === model.personal.viewerId && <Card size="sm"><CardHeader><CardTitle><StatTitle title="내 승부예측" help="실제 정산된 포인트의 일별 수익·손실입니다. 현재 규칙은 적중 보상만 지급하며 실패 차감은 없습니다. 미지급·무승부·무효는 0pt이며, 기록 정정에 따른 차감도 실제 거래 날짜에 반영합니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums"><span className="text-emerald-400">수익 +{earned.toLocaleString()}pt</span><span className="text-rose-400">손실 −{lost.toLocaleString()}pt</span><strong>순수익 {earned - lost > 0 ? "+" : ""}{(earned - lost).toLocaleString()}pt</strong></div>
        <StatsTimeChart label="승부예측 포인트 그래프" unit="pt" lines={[
          { label: "수익", color: "var(--color-emerald-400)", points: predictionDays.map((day) => ({ at: day.date + "T12:00:00+09:00", value: day.earned })) },
          { label: "손실", color: "var(--color-rose-400)", points: predictionDays.map((day) => ({ at: day.date + "T12:00:00+09:00", value: -day.lost })) },
        ]} empty="승부예측 기록이 없습니다." />
      </CardContent></Card>}
      <StatsEmblems hof={model.hof} userId={person.userId} />
    </div>
  );
}

export function ClanStatsExperience({ gameSlug, clanId, model }: { gameSlug: string; clanId: string; model: ClanStatsPageModel }) {
  const [tab, setTab] = useState("hof");
  const [personId, setPersonId] = useState<string | null>(null);
  const choosePerson = (id: string) => {
    if (!model.personal.people.some((person) => person.userId === id)) return;
    setPersonId(id);
    setTab("personal");
  };
  return <div className="mx-auto w-full max-w-[1120px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="text-xl font-bold tracking-tight"><StatTitle title="클랜 통계" help="명예의 전당, 내전 통계, 경기 기록과 개인 기록을 살펴봅니다." /></h2></div>{model.hof.exposeHof && <Badge variant="secondary">명예의 전당 공개 중</Badge>}</div>
    <Tabs value={tab} onValueChange={(value) => { setTab(value); if (value === "personal") setPersonId(null); }} className="w-full"><TabsList variant="line" className="mb-4 h-auto w-full justify-start gap-0 border-b [&_button]:gap-1 [&_button]:px-1 [&_button]:text-xs sm:[&_button]:text-sm [&_svg]:hidden sm:[&_svg]:block"><TabsTrigger value="hof"><Crown className="size-4" aria-hidden="true" /> 명예의 전당</TabsTrigger><TabsTrigger value="intra"><Swords className="size-4" aria-hidden="true" /> 내전 통계</TabsTrigger>{model.permissions.viewMatchRecords && <TabsTrigger value="records"><History className="size-4" aria-hidden="true" /> 경기 기록</TabsTrigger>}{model.permissions.viewPersonalRecords && <TabsTrigger value="personal"><UserRound className="size-4" aria-hidden="true" /> 개인 기록</TabsTrigger>}</TabsList>
      <TabsContent value="hof"><HallOfFame model={model} gameSlug={gameSlug} clanId={clanId} onChoosePerson={choosePerson} /></TabsContent>
      <TabsContent value="intra"><IntraClanStats model={model} /></TabsContent>
      {model.permissions.viewMatchRecords && <TabsContent value="records"><ClanMatchHistory model={model} /></TabsContent>}
      {model.permissions.viewPersonalRecords && <TabsContent value="personal">{personId ? <PersonalStats key={personId} model={model} selectedId={personId} onBack={() => setPersonId(null)} /> : <StatsMemberPicker people={model.personal.people} onSelect={choosePerson} />}</TabsContent>}
    </Tabs>
  </div>;
}
