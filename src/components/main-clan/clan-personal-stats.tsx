"use client";

import { formatPercent } from "@/lib/format-percent";
import { useState, type ReactNode } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle, StatTooltip } from "./stat-help";
import { StatsPlayerBanner } from "./stats-emblems";
import { StatsDonut } from "./stats-donut";
import { ClanPlayerAvatar } from "@/components/profile/clan-namecards";
import { MAP_TYPES, mapDetailsForLabel, type MapType } from "@/lib/balance/map-pools";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatsScoreEditor } from "./stats-score-editor";
import { StatsSignedTrendChart, StatsTimeChart } from "./stats-time-chart";
import { Map as MapIcon, Target, TrendingUp, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { currentStreak, longestStreak, recordTotals, relationRows, type PersonalMatch, type StatRole } from "@/lib/clan/stats/clan-stats-analytics";

import { StatsPeriodFilter } from "./stats-period-filter";
import { statsPeriodKey, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { OverwatchMapIcon, OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
const ROLE_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "tank", label: "돌격", icon: <OverwatchRoleIcon role="tank" /> },
  { id: "dmg", label: "공격", icon: <OverwatchRoleIcon role="damage" /> },
  { id: "sup", label: "지원", icon: <OverwatchRoleIcon role="support" /> },
] as const;
const RESULT_LABEL = { win: "승", draw: "무", loss: "패" } as const;
const MAP_TYPE_OPTIONS = [{ id: "all", label: "전체" }, ...MAP_TYPES.map(type => ({ ...type, icon: <OverwatchMapIcon type={type.id} /> }))] as const;

function rate(value: number | null) {
  return formatPercent(value, "기록 없음");
}

function FilterButtons<T extends string>({ options, value, onChange, label }: {
  options: readonly { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return <RubberSegment options={options} value={value} onChange={onChange} label={label} labelPosition="top" />;
}

type SynergyPeer = ReturnType<typeof relationRows>[number];

function synergyVerdict(rate: number, relation: "ally" | "enemy") {
  if (rate <= 30) return relation === "ally" ? "최악의 듀오" : "넘기 힘든 상대";
  if (rate < 35) return relation === "ally" ? "엇갈린 호흡" : "까다로운 상대";
  if (rate < 40) return relation === "ally" ? "아쉬운 호흡" : "불리한 상대";
  if (rate < 45) return relation === "ally" ? "호흡을 맞추는 중" : "조금 밀리는 상대";
  if (rate < 50) return relation === "ally" ? "가능성이 보이는 듀오" : "접전의 상대";
  if (rate < 55) return relation === "ally" ? "반반의 궁합" : "팽팽한 상대";
  if (rate < 60) return relation === "ally" ? "무난한 호흡" : "해볼 만한 상대";
  if (rate < 65) return relation === "ally" ? "좋은 호흡" : "우세한 상대";
  if (rate < 70) return relation === "ally" ? "환상의 호흡" : "상성이 좋은 상대";
  return relation === "ally" ? "운명의 상대" : "완벽한 천적";
}

function SynergyRing({ peer, relation }: { peer: SynergyPeer | undefined; relation: "ally" | "enemy" }) {
  if (!peer) return <aside aria-label="시너지 승률 차트" className="flex h-80 items-center justify-center rounded-xl border border-dashed px-5 text-center text-sm text-muted-foreground">멤버 이름에 마우스를 올리거나 선택하면 시너지 승률이 표시됩니다.</aside>;
  const percentage = Math.round(peer.wins / peer.matches * 1000) / 10;
  return <aside aria-label="시너지 승률 차트" className="flex h-80 flex-col items-center justify-center rounded-xl border bg-muted/15 px-3 py-4 text-center">
    <h3 className="mb-2 max-w-full truncate px-1 text-sm font-medium text-foreground/90" title={peer.nickname}>{peer.nickname}</h3>
    <div className="relative size-44 text-team-red">
      <svg viewBox="0 0 180 180" role="img" aria-label={`${peer.nickname} ${relation === "ally" ? "같은 팀" : "상대 팀"} 승률 ${formatPercent(percentage)}, ${peer.matches}경기`} className="size-full overflow-visible">
        <circle cx="90" cy="90" r="68" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".4" strokeWidth="15" />
        <circle cx="90" cy="90" r="68" fill="none" stroke="currentColor" strokeWidth="15" pathLength="100" strokeDasharray={`${percentage} 100`} transform="rotate(-90 90 90)" className="transition-[stroke-dasharray] duration-300 motion-reduce:transition-none" />
      </svg>
      <div className="pointer-events-none absolute inset-9 isolate overflow-hidden rounded-full border border-primary/25 bg-primary/15 text-primary">
        <span className="absolute inset-0 grid place-items-center"><ClanPlayerAvatar userId={peer.id} label={peer.nickname} size={104} /></span>
      </div>
    </div>
    <strong className="-mt-1 text-3xl font-bold tracking-tight tabular-nums">{formatPercent(percentage)}</strong>
    <p className="mt-1 text-xs font-medium text-team-red">{synergyVerdict(percentage, relation)}</p>
    <p className="mt-2 text-xs text-muted-foreground">{peer.matches}경기 · {peer.wins}승 {peer.draws}무 {peer.losses}패</p>
  </aside>;
}

export function PersonalStats({ model, selectedId, onBack, gameSlug, clanId, settings, pending = false, banner, initialPeerId = null }: { banner?: ReactNode; initialPeerId?: string | null; settings?: ReactNode; model: ClanStatsPageModel; selectedId: string; onBack: () => void; gameSlug: string; clanId: string; pending?: boolean }) {
  const now = currentKstYearMonth();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const [role, setRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [peerRole, setPeerRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [relation, setRelation] = useState<"ally" | "enemy">("ally");
  const [peerId, setPeerId] = useState<string | null>(initialPeerId);
  const [relationSort, setRelationSort] = useState<"matches" | "wins" | "draws" | "losses" | "rate">("matches");
  const [relationDescending, setRelationDescending] = useState(true);
  const [mapRole, setMapRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [mapType, setMapType] = useState<MapType | "all">("all");
  const [mapSort, setMapSort] = useState<"matches" | "rate">("matches");
  const [scoreKind, setScoreKind] = useState<"evaluation" | "analysis">("evaluation");
  const [scoreRole, setScoreRole] = useState<"tank" | "dmg" | "sup">("tank");
  const person = model.personal.people.find((candidate) => candidate.userId === selectedId) ?? model.personal.people[0];
  const value = (content: ReactNode) => pending ? "—" : content;
  const visible = (section: NonNullable<typeof person.visibleSections>[number]) => !person.visibleSections || person.visibleSections.includes(section);
  const activeScoreKind = visible(scoreKind) ? scoreKind : visible("evaluation") ? "evaluation" : "analysis";
  const years = [...new Set([String(now.year), ...person.matches.map((match) => match.date.slice(0, 4)), ...(person.scores ?? []).map((score) => score.date.slice(0, 4)), ...person.predictions.map((pick) => pick.date.slice(0, 4)), ...person.predictionPoints.map((day) => day.date.slice(0, 4))])].sort().reverse();
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
  const roleRows = ROLE_OPTIONS.map((option) => ({ ...option, ...recordTotals(option.id === "all" ? matches : matches.filter((match) => match.role === option.id)) }));
  const mapMatches = matches.filter((match) => (mapRole === "all" || match.role === mapRole) && (mapType === "all" || (match.map && mapDetailsForLabel(match.map)?.type === mapType)));
  const mapGroups = new Map<string, PersonalMatch[]>();
  for (const match of mapMatches) {
    if (!match.map) continue;
    if (!mapGroups.has(match.map)) mapGroups.set(match.map, []);
    mapGroups.get(match.map)!.push(match);
  }
  const maps = [...mapGroups].map(([name, rows]) => ({ name, ...recordTotals(rows) })).sort((a, b) => mapSort === "matches" ? b.matches - a.matches : (b.rate ?? -1) - (a.rate ?? -1));
  const selectedPeer = relations.find((row) => row.id === peerId) ?? relations[0];
  const roleScores = (person.scores ?? person.matches).filter((score) => score.role === scoreRole);
  const currentScore = roleScores.find((score) => score[activeScoreKind] !== null)?.[activeScoreKind];
  const scorePoints = roleScores.filter((score) => inPeriod(score.date)).toReversed().map((score) => ({ at: score.occurredAt, value: score[activeScoreKind] }));
  const scoreMatches = matches.filter((match) => match.role === scoreRole);
  const predictionDays = person.predictionPoints.filter((item) => inPeriod(item.date));
  const earned = predictionDays.reduce((sum, day) => sum + day.earned, 0);
  const lost = predictionDays.reduce((sum, day) => sum + day.lost, 0);
  const picks = person.predictions.filter((pick) => inPeriod(pick.date));
  const correct = picks.filter((pick) => pick.result === "correct").length;
  const incorrect = picks.filter((pick) => pick.result === "incorrect").length;
  const predictionRate = correct + incorrect ? Math.round(correct / (correct + incorrect) * 1000) / 10 : null;
  const ownPrediction = person.userId === model.personal.viewerId;
  const canViewPredictionPoints = visible("prediction_points") && (ownPrediction || model.permissions.isStaff);
  const predictionTrend = predictionDays.map((day) => ({ date: day.date, change: day.net }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<{ at: string; value: number }[]>((trend, { date, change }) => [...trend, { at: date + "T12:00:00+09:00", value: (trend.at(-1)?.value ?? 0) + change }], []);
  return (
    <div className="space-y-5" aria-busy={pending}>
      <section aria-label="개인 기록 기간" className="sticky top-[60px] z-30 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"><div className="flex items-center justify-between gap-1.5 sm:flex-wrap sm:gap-3"><StatsPeriodFilter value={period} onChange={(next) => { setPeriod(next); setPeerId(null); }} years={years} /><div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2"><StatTooltip label="멤버 선택" description="멤버 목록으로 돌아갑니다." render={<Button type="button" variant="ghost" size="icon" className="size-8" aria-label="멤버 선택" onClick={onBack} />}><Users className="size-4" aria-hidden="true" /></StatTooltip>{settings}</div></div></section>
      {banner !== undefined ? banner : <StatsPlayerBanner gameSlug={gameSlug} clanId={clanId} awards={person.emblems} showEmblems={visible("emblems")} hof={model.hof} userId={person.userId} nickname={person.nickname} profile={person.profile} />}
      {visible("records") && <><Card size="sm" role="region" aria-label="플레이어 요약">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight"><UserRound className="size-4 shrink-0 text-primary" aria-hidden="true" />플레이어 요약</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <section aria-label="역할별 승률" className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-medium text-muted-foreground">역할별 승률</h3><span className="text-xs text-muted-foreground">참여 내전 {value(totals.sessions)}회</span></div>
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[400px] text-sm tabular-nums">
                <thead className="border-b text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 text-left font-normal">역할</th><th scope="col" className="px-3 py-2 text-right font-normal">승률</th><th scope="col" className="px-3 py-2 text-right font-normal">승/무/패</th><th scope="col" className="px-3 py-2 text-right font-normal">경기</th></tr></thead>
                <tbody>{roleRows.map((row) => <tr key={row.id} className={`border-b border-border/60 ${row.id === "all" ? "bg-primary/5" : ""}`}>
                  <th scope="row" className="px-3 py-3 text-left font-medium text-foreground/90"><span className="inline-flex items-center gap-2">{"icon" in row && row.icon}{row.label}</span></th>
                  <td className={`px-3 py-3 text-right font-bold tracking-tight ${row.id === "all" ? "text-2xl text-primary" : "text-xl"}`}>{value(rate(row.rate))}</td><td className="px-3 py-3 text-right text-xs text-muted-foreground">{value(`${row.wins}/${row.draws}/${row.losses}`)}</td><td className="px-3 py-3 text-right text-sm font-medium text-foreground/80">{value(row.matches)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm font-semibold"><span>최근 흐름</span><span className={`text-xs ${streak.count ? streak.result === "win" ? "text-team-blue" : "text-team-red" : "text-muted-foreground"}`}>{value(streak.count ? `${streak.count}연${streak.result === "win" ? "승" : "패"}` : "현재 연속 기록 없음")}</span></div><div className="mt-3 flex h-8 items-start gap-1.5 overflow-x-auto">{person.matches.slice(0, 10).map((match) => <span key={match.id} title={`${match.date} ${match.map ?? "맵 미기록"}`} className={`rounded px-2 py-1 text-xs ${match.result === "win" ? "bg-sky-500/15 text-team-blue" : match.result === "loss" ? "bg-rose-500/15 text-team-red" : "bg-muted"}`}>{RESULT_LABEL[match.result]}</span>)}{!person.matches.length && <span className="text-sm text-muted-foreground">{pending ? "불러오는 중…" : "기록 없음"}</span>}</div></div>
            <div className="grid grid-cols-2 gap-3">{([{ label: "최장 연승", row: bestWin }, { label: "최장 연패", row: bestLoss }] as const).map(({ label, row }) => <div key={label} className="min-w-0 rounded-xl bg-background/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><strong className="mt-2 block text-xl font-semibold tracking-tight tabular-nums">{value(row.count ? `${row.count}경기` : "기록 없음")}</strong></div>)}</div>
          </div>
        </CardContent>
      </Card>
      <Card size="sm" role="region" aria-label="맵별 승률"><CardHeader><CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight"><MapIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />맵별 승률</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex min-w-0 flex-wrap items-end gap-3"><FilterButtons label="역할" options={ROLE_OPTIONS} value={mapRole} onChange={setMapRole} /><FilterButtons label="맵 형식" options={MAP_TYPE_OPTIONS} value={mapType} onChange={setMapType} /></div><FilterButtons label="맵 정렬" options={[{ id: "matches", label: "출전순" }, { id: "rate", label: "승률순" }]} value={mapSort} onChange={setMapSort} /></div>
        <section aria-label="맵별 승률 목록"><StatsDonut busy={pending} label="맵별 승률" unit="경기" showImages horizontal preserveOrder mapResults rows={maps.map((row) => ({ name: row.name, value: row.matches, image: mapDetailsForLabel(row.name)?.image, wins: row.wins, draws: row.draws, losses: row.losses, rate: row.rate }))} /></section>
      </CardContent></Card>
      </>}
      {model.personal.canSeePeers && <Card size="sm" role="region" aria-label="시너지"><CardHeader><CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight"><Users className="size-4 shrink-0 text-primary" aria-hidden="true" /><StatTitle title="시너지" help={<>내 역할과 상대 역할, 팀 관계를 함께 선택합니다.</>} /></CardTitle></CardHeader><CardContent className="space-y-4">
        {model.personal.canSeePeers ? <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><FilterButtons label="내 역할" options={ROLE_OPTIONS} value={role} onChange={(value) => { setRole(value); setPeerId(null); }} /><FilterButtons label="팀 관계" options={[{ id: "ally", label: "같은 팀" }, { id: "enemy", label: "상대 팀" }]} value={relation} onChange={(value) => { setRelation(value); setPeerId(null); }} />
          <div><FilterButtons label="상대 역할" options={ROLE_OPTIONS} value={peerRole} onChange={(value) => { setPeerRole(value); setPeerId(null); }} /></div></div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <SynergyRing peer={selectedPeer} relation={relation} />
          <StatsScrollArea label="시너지 기록 목록" className="h-80">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[500px] text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="p-2 text-left">멤버</th>
                  <th scope="col" className="p-2 text-right" aria-sort={relationSort === "rate" ? relationDescending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => sortRelation("rate")} className="hover:text-foreground">승률{relationSort === "rate" ? relationDescending ? " ↓" : " ↑" : ""}</button></th>
                  <th scope="col" className="p-2 text-right" aria-label="승/무/패"><span className="inline-flex items-center justify-end gap-0.5">{([{ key: "wins", label: "승" }, { key: "draws", label: "무" }, { key: "losses", label: "패" }] as const).map(({ key, label }, index) => <span key={key}><button type="button" aria-label={`${label} 정렬`} onClick={() => sortRelation(key)} className="hover:text-foreground">{label}{relationSort === key ? relationDescending ? " ↓" : " ↑" : ""}</button>{index < 2 && <span aria-hidden="true"> / </span>}</span>)}</span></th>
                  <th scope="col" className="p-2 text-right" aria-sort={relationSort === "matches" ? relationDescending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => sortRelation("matches")} className="hover:text-foreground">경기{relationSort === "matches" ? relationDescending ? " ↓" : " ↑" : ""}</button></th>
                </tr></thead>
                <tbody>{relations.map((row) => <tr key={row.id} onPointerEnter={() => setPeerId(row.id)} onClick={() => setPeerId(row.id)} className={`cursor-pointer border-b hover:bg-muted/40 ${selectedPeer?.id === row.id ? "bg-muted/40" : ""}`}>
                  <th scope="row" className="p-2 text-left"><button type="button" className="rounded-sm text-left font-medium text-foreground/90 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary" aria-pressed={selectedPeer?.id === row.id} onFocus={() => setPeerId(row.id)} onClick={() => setPeerId(row.id)}>{row.nickname}</button></th>
                  <td className="p-2 text-right text-lg font-semibold tracking-tight tabular-nums">{formatPercent(row.wins / row.matches * 100)}</td>
                  <td className="whitespace-nowrap p-2 text-right text-xs text-muted-foreground tabular-nums">{row.wins}승 / {row.draws}무 / {row.losses}패</td>
                  <td className="p-2 text-right text-sm text-foreground/80 tabular-nums">{row.matches}</td>
                </tr>)}</tbody>
              </table>
              {relations.length === 0 && <p role={pending ? "status" : undefined} className="py-5 text-center text-sm text-muted-foreground">{pending ? "기록을 불러오는 중…" : "해당 역할 조합의 기록이 없습니다."}</p>}
            </div>
          </StatsScrollArea>
          </div>
        </> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">상대별 전적은 클랜의 관계 통계 열람 권한에 따라 제공됩니다.</p>}
      </CardContent></Card>}
      <div className={`grid min-w-0 gap-4 ${(visible("evaluation") || visible("analysis")) && (visible("predictions") || canViewPredictionPoints) ? "lg:grid-cols-2" : ""}`} aria-label="개인 기록 그래프">
      {(visible("evaluation") || visible("analysis")) && <Card size="sm" className="min-w-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight"><TrendingUp className="size-4 shrink-0 text-primary" aria-hidden="true" />점수 변동 이력</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <FilterButtons label="점수 역할" options={ROLE_OPTIONS.filter((option) => option.id !== "all")} value={scoreRole} onChange={setScoreRole} />
          <FilterButtons label="점수 종류" options={([{ id: "evaluation", label: "평가 점수" }, { id: "analysis", label: "분석 점수" }] as const).filter(({ id }) => visible(id))} value={activeScoreKind} onChange={setScoreKind} />
        </div>
        <div aria-label={`현재 ${activeScoreKind === "evaluation" ? "평가" : "분석"} 점수`} className="relative space-y-1 rounded-xl bg-background/30 p-4 pr-12">
          {activeScoreKind === "evaluation" && model.permissions.editMscore && <div className="absolute right-3 top-3"><StatsScoreEditor key={periodKey + person.userId + scoreRole} gameSlug={gameSlug} clanId={clanId} playerId={person.userId} matches={scoreMatches} /></div>}
          <p className="text-xs text-muted-foreground">현재 {activeScoreKind === "evaluation" ? "평가" : "분석"} 점수</p>
          <p className="flex h-10 items-baseline gap-1 text-primary"><strong className="text-4xl font-bold tracking-tight tabular-nums">{pending ? "—" : currentScore == null ? "기록 없음" : currentScore.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}</strong>{!pending && currentScore != null && <span className="text-sm">점</span>}</p>
        </div>
        <StatsTimeChart busy={pending} label="점수 변동 이력 그래프" unit="점" lines={[{ label: activeScoreKind === "evaluation" ? "평가 점수" : "분석 점수", color: "var(--primary)", points: scorePoints }]} empty="저장된 점수 변동 이력이 없습니다." />
      </CardContent></Card>}
      {(visible("predictions") || canViewPredictionPoints) && <Card size="sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight"><Target className="size-4 shrink-0 text-primary" aria-hidden="true" /><StatTitle title="승부예측 기록" help="무효 경기를 제외한 예측의 적중 확률입니다. 본인과 운영진에게 실제 정산 포인트의 일별 누적 흐름을 표시합니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
        {visible("predictions") && <div className="space-y-3 rounded-lg bg-background/30 p-4 tabular-nums" aria-label="승부예측 요약">
          <div className="grid grid-cols-2 items-end gap-4 xl:grid-cols-[1.3fr_repeat(3,1fr)]">
            <span className="text-xs text-muted-foreground">적중력 <strong className={`mt-1.5 block h-9 font-bold tracking-tight ${predictionRate === null ? "text-lg leading-9 text-muted-foreground" : "text-3xl leading-9 text-primary"}`}>{value(rate(predictionRate))}</strong></span>
            <span className="text-xs text-muted-foreground">예측 참여 <strong className="mt-1.5 block text-lg font-semibold text-foreground/90">{value(picks.length)}회</strong></span>
            <span className="text-xs text-muted-foreground">적중 <strong className="mt-1.5 block text-lg font-semibold text-foreground/90">{value(correct)}회</strong></span>
            <span className="text-xs text-muted-foreground">실패 <strong className="mt-1.5 block text-lg font-semibold text-foreground/90">{value(incorrect)}회</strong></span>
          </div>
          <p className="border-t pt-3 text-xs text-muted-foreground">무승부 적중 {value(picks.filter((pick) => pick.outcome === "draw" && pick.result === "correct").length)}회 · 무효 {value(picks.filter((pick) => pick.result === "void").length)}회</p>
        </div>}
        {canViewPredictionPoints && <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 py-1 tabular-nums"><div className="flex gap-4 text-xs text-muted-foreground"><span>수익 <span className="text-primary">{value(`+${earned.toLocaleString()}`)}pt</span></span><span>손실 <span className="text-team-red">{value(`−${lost.toLocaleString()}`)}pt</span></span></div><span className="text-xs text-muted-foreground">순수익 <strong className="ml-1 text-xl font-semibold tracking-tight text-foreground">{value(`${earned - lost > 0 ? "+" : ""}${(earned - lost).toLocaleString()}`)}<span className="ml-0.5 text-xs font-normal text-muted-foreground">pt</span></strong></span></div>}
        {canViewPredictionPoints ? <><StatsSignedTrendChart busy={pending} label="승부예측 누적 포인트 그래프" unit="pt" points={predictionTrend} empty="선택한 기간에 승부예측 기록이 없습니다." /></> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">{ownPrediction ? "클랜의 공개 설정에 따라 포인트 통계가 제공되지 않습니다." : "포인트 수익·손실은 본인과 운영진만 볼 수 있습니다."}</p>}
      </CardContent></Card>}
      </div>
    </div>
  );
}
