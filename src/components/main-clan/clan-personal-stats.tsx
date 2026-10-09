"use client";

import { useState, type ReactNode } from "react";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { StatTitle, StatHelp } from "./stat-help";
import { StatsPlayerBanner } from "./stats-emblems";
import { StatsDonut } from "./stats-donut";
import { MAP_TYPES, mapDetailsForLabel, type MapType } from "@/lib/balance/map-pools";
import { StatsScrollArea } from "./stats-scroll-area";
import { StatsScoreEditor } from "./stats-score-editor";
import { StatsSignedTrendChart, StatsTimeChart } from "./stats-time-chart";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { currentKstYearMonth } from "@/lib/clan/stats/hof-config";
import { currentStreak, longestStreak, recordTotals, relationRows, type PersonalMatch, type StatRole } from "@/lib/clan/stats/clan-stats-analytics";

import { StatsPeriodFilter } from "./stats-period-filter";
import { statsPeriodKey, type StatsPeriod } from "@/lib/clan/stats/intra-overview";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
const ROLE_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "tank", label: "돌격", icon: <OverwatchRoleIcon role="tank" /> },
  { id: "dmg", label: "공격", icon: <OverwatchRoleIcon role="damage" /> },
  { id: "sup", label: "지원", icon: <OverwatchRoleIcon role="support" /> },
] as const;
const RESULT_LABEL = { win: "승", draw: "무", loss: "패" } as const;
const MAP_TYPE_OPTIONS = [{ id: "all", label: "전체" }, ...MAP_TYPES] as const;

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
  if (!peer) return <aside aria-label="시너지 승률 차트" className="flex min-h-64 items-center justify-center rounded-xl border border-dashed px-5 text-center text-sm text-muted-foreground">멤버 이름에 마우스를 올리거나 선택하면 시너지 승률이 표시됩니다.</aside>;
  const percentage = Math.round(peer.wins / peer.matches * 1000) / 10;
  return <aside aria-label="시너지 승률 차트" className="flex min-h-64 flex-col items-center justify-center rounded-xl border bg-muted/15 px-3 py-4 text-center">
    <h3 className="mb-2 max-w-full truncate px-1 text-sm font-semibold" title={peer.nickname}>{peer.nickname}</h3>
    <div className="relative size-44 text-rose-400">
      <svg viewBox="0 0 180 180" role="img" aria-label={`${peer.nickname} ${relation === "ally" ? "같은 팀" : "상대 팀"} 승률 ${percentage}%, ${peer.matches}경기`} className="size-full overflow-visible">
        <circle cx="90" cy="90" r="68" fill="none" stroke="var(--muted-foreground)" strokeOpacity=".4" strokeWidth="15" />
        <circle cx="90" cy="90" r="68" fill="none" stroke="currentColor" strokeWidth="15" pathLength="100" strokeDasharray={`${percentage} 100`} transform="rotate(-90 90 90)" className="transition-[stroke-dasharray] duration-300 motion-reduce:transition-none" />
      </svg>
      <div className="pointer-events-none absolute inset-9 isolate overflow-hidden rounded-full border border-primary/25 bg-primary/15 text-primary">
        <span aria-label="기본 프로필 이미지" className="absolute inset-0 grid place-items-center"><UserRound className="size-16" aria-hidden="true" /></span>
      </div>
    </div>
    <strong className="-mt-1 text-2xl tabular-nums">{percentage}%</strong>
    <p className="mt-1 text-sm font-semibold text-rose-400">{synergyVerdict(percentage, relation)}</p>
    <p className="mt-1 text-[11px] text-muted-foreground">{peer.matches}경기 · {peer.wins}승 {peer.draws}무 {peer.losses}패</p>
  </aside>;
}

export function PersonalStats({ model, selectedId, onBack, gameSlug, clanId }: { model: ClanStatsPageModel; selectedId: string; onBack: () => void; gameSlug: string; clanId: string }) {
  const now = currentKstYearMonth();
  const [period, setPeriod] = useState<StatsPeriod>({ mode: "all", year: String(now.year), month: String(now.month).padStart(2, "0"), day: "all" });
  const [role, setRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [peerRole, setPeerRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [relation, setRelation] = useState<"ally" | "enemy">("ally");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [relationSort, setRelationSort] = useState<"matches" | "wins" | "draws" | "losses" | "rate">("matches");
  const [relationDescending, setRelationDescending] = useState(true);
  const [mapRole, setMapRole] = useState<Exclude<StatRole, null> | "all">("all");
  const [mapType, setMapType] = useState<MapType | "all">("all");
  const [mapSort, setMapSort] = useState<"matches" | "rate">("matches");
  const [scoreKind, setScoreKind] = useState<"evaluation" | "analysis">("evaluation");
  const person = model.personal.people.find((candidate) => candidate.userId === selectedId) ?? model.personal.people[0];
  const years = [...new Set([String(now.year), ...person.matches.map((match) => match.date.slice(0, 4)), ...person.predictions.map((pick) => pick.date.slice(0, 4)), ...person.predictionPoints.map((day) => day.date.slice(0, 4))])].sort().reverse();
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
  const selectedPeer = relations.find((row) => row.id === peerId);
  const scorePoints = [...matches].reverse().map((match) => ({ at: match.occurredAt, value: match[scoreKind] }));
  const predictionDays = person.predictionPoints.filter((item) => inPeriod(item.date));
  const earned = predictionDays.reduce((sum, day) => sum + day.earned, 0);
  const lost = predictionDays.reduce((sum, day) => sum + day.lost, 0);
  const picks = person.predictions.filter((pick) => inPeriod(pick.date));
  const correct = picks.filter((pick) => pick.result === "correct").length;
  const incorrect = picks.filter((pick) => pick.result === "incorrect").length;
  const predictionRate = correct + incorrect ? Math.round(correct / (correct + incorrect) * 1000) / 10 : null;
  const ownPrediction = person.userId === model.personal.viewerId;
  const canViewPredictionPoints = ownPrediction || model.permissions.isStaff;
  const predictionTrend = predictionDays.map((day) => ({ date: day.date, change: day.net }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<{ at: string; value: number }[]>((trend, { date, change }) => [...trend, { at: date + "T12:00:00+09:00", value: (trend.at(-1)?.value ?? 0) + change }], []);
  return (
    <div className="space-y-5">
      <StatsPlayerBanner awards={person.emblems} hof={model.hof} userId={person.userId} nickname={person.nickname} />
      <section aria-label="개인 기록 기간" className="sticky top-[60px] z-30 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"><div className="flex flex-wrap items-end justify-between gap-3"><StatsPeriodFilter value={period} onChange={(next) => { setPeriod(next); setPeerId(null); }} years={years} /><Button type="button" variant="outline" size="sm" onClick={onBack}>멤버 선택</Button></div></section>
      <Card size="sm" role="region" aria-label="플레이어 요약">
        <CardHeader><CardTitle>플레이어 요약</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <section aria-label="역할별 승률" className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold"><StatTitle title="역할별 승률" help="선택 기간에 실제 배정된 역할별 경기와 승·무·패를 표시합니다. 전체에는 역할 미상 경기도 포함됩니다. 승률은 승 ÷ (승 + 무 + 패)입니다." /></h3><span className="text-xs text-muted-foreground">참여 내전 {totals.sessions}회</span></div>
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[400px] text-sm tabular-nums">
                <thead className="border-b text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2 text-left font-semibold">역할</th><th scope="col" className="px-3 py-2 text-right font-semibold">승률</th><th scope="col" className="px-3 py-2 text-right font-semibold">승/무/패</th><th scope="col" className="px-3 py-2 text-right font-semibold">경기</th></tr></thead>
                <tbody>{roleRows.map((row) => <tr key={row.id} className="border-b last:border-b-0">
                  <th scope="row" className="px-3 py-2.5 text-left font-semibold"><span className="inline-flex items-center gap-2">{"icon" in row && row.icon}{row.label}</span></th>
                  <td className="px-3 py-2.5 text-right font-semibold">{rate(row.rate)}</td><td className="px-3 py-2.5 text-right">{row.wins}/{row.draws}/{row.losses}</td><td className="px-3 py-2.5 text-right">{row.matches}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
          <div className="grid gap-4 border-t pt-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm font-semibold"><span>최근 흐름</span><span className={`text-xs ${streak.count ? streak.result === "win" ? "text-sky-400" : "text-rose-400" : "text-muted-foreground"}`}>{streak.count ? `${streak.count}연${streak.result === "win" ? "승" : "패"}` : "현재 연속 기록 없음"}</span><StatHelp title="최근 흐름">현재 연속은 선택 기간과 관계없이 최신 전체 경기 기준입니다.</StatHelp></div><div className="mt-3 flex flex-wrap gap-1.5">{person.matches.slice(0, 10).map((match) => <span key={match.id} title={`${match.date} ${match.map ?? "맵 미기록"}`} className={`rounded px-2 py-1 text-xs ${match.result === "win" ? "bg-sky-500/15 text-sky-400" : match.result === "loss" ? "bg-rose-500/15 text-rose-400" : "bg-muted"}`}>{RESULT_LABEL[match.result]}</span>)}{!person.matches.length && <span className="text-sm text-muted-foreground">기록 없음</span>}</div></div>
            <div className="grid grid-cols-2 gap-3">{([{ label: "최장 연승", row: bestWin }, { label: "최장 연패", row: bestLoss }] as const).map(({ label, row }) => <div key={label} className="min-w-0 rounded-xl border bg-muted/10 p-3"><p className="text-xs text-muted-foreground"><StatTitle title={label} help="선택한 기간 안에서 이어진 최장 연속 기록입니다." /></p><strong className="mt-2 block text-lg tabular-nums">{row.count ? `${row.count}경기` : "기록 없음"}</strong></div>)}</div>
          </div>
        </CardContent>
      </Card>
      <Card size="sm" role="region" aria-label="맵별 승률"><CardHeader><CardTitle><StatTitle title="맵별 승률" help="선택 조건의 맵별 출전 비중과 승·무·패 및 승률을 표시합니다. 도넛 면적은 출전 경기 수 기준입니다." /></CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex min-w-0 flex-wrap items-end gap-3"><FilterButtons label="역할" options={ROLE_OPTIONS} value={mapRole} onChange={setMapRole} /><FilterButtons label="맵 형식" options={MAP_TYPE_OPTIONS} value={mapType} onChange={setMapType} /></div><FilterButtons label="맵 정렬" options={[{ id: "matches", label: "출전순" }, { id: "rate", label: "승률순" }]} value={mapSort} onChange={setMapSort} /></div>
        <section aria-label="맵별 승률 목록"><StatsDonut key={periodKey + mapRole + mapType + mapSort} label="맵별 승률" unit="경기" showImages horizontal preserveOrder mapResults rows={maps.map((row) => ({ name: row.name, value: row.matches, image: mapDetailsForLabel(row.name)?.image, wins: row.wins, draws: row.draws, losses: row.losses, rate: row.rate }))} /></section>
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="시너지" help={<>내 역할과 상대 역할, 팀 관계를 함께 선택합니다.</>} /></CardTitle></CardHeader><CardContent className="space-y-4">
        {model.personal.canSeePeers ? <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2"><FilterButtons label="내 역할" options={ROLE_OPTIONS} value={role} onChange={(value) => { setRole(value); setPeerId(null); }} /><FilterButtons label="팀 관계" options={[{ id: "ally", label: "같은 팀" }, { id: "enemy", label: "상대 팀" }]} value={relation} onChange={(value) => { setRelation(value); setPeerId(null); }} />
          <div><FilterButtons label="상대 역할" options={ROLE_OPTIONS} value={peerRole} onChange={(value) => { setPeerRole(value); setPeerId(null); }} /></div></div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <StatsScrollArea label="시너지 기록 목록" className="max-h-80">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[500px] text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground">
                  <th scope="col" className="p-2 text-left">멤버</th>
                  <th scope="col" className="p-2 text-right" aria-sort={relationSort === "rate" ? relationDescending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => sortRelation("rate")} className="hover:text-foreground">승률{relationSort === "rate" ? relationDescending ? " ↓" : " ↑" : ""}</button></th>
                  <th scope="col" className="p-2 text-right" aria-label="승/무/패"><span className="inline-flex items-center justify-end gap-0.5">{([{ key: "wins", label: "승" }, { key: "draws", label: "무" }, { key: "losses", label: "패" }] as const).map(({ key, label }, index) => <span key={key}><button type="button" aria-label={`${label} 정렬`} onClick={() => sortRelation(key)} className="hover:text-foreground">{label}{relationSort === key ? relationDescending ? " ↓" : " ↑" : ""}</button>{index < 2 && <span aria-hidden="true"> / </span>}</span>)}</span></th>
                  <th scope="col" className="p-2 text-right" aria-sort={relationSort === "matches" ? relationDescending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => sortRelation("matches")} className="hover:text-foreground">경기{relationSort === "matches" ? relationDescending ? " ↓" : " ↑" : ""}</button></th>
                </tr></thead>
                <tbody>{relations.map((row) => <tr key={row.id} className="border-b">
                  <th scope="row" className="p-2 text-left"><button type="button" className="rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary" aria-pressed={selectedPeer?.id === row.id} onPointerEnter={() => setPeerId(row.id)} onFocus={() => setPeerId(row.id)} onClick={() => setPeerId(row.id)}>{row.nickname}</button></th>
                  <td className="p-2 text-right tabular-nums">{Math.round(row.wins / row.matches * 1000) / 10}%</td>
                  <td className="whitespace-nowrap p-2 text-right tabular-nums">{row.wins}승 / {row.draws}무 / {row.losses}패</td>
                  <td className="p-2 text-right tabular-nums">{row.matches}</td>
                </tr>)}</tbody>
              </table>
              {relations.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">해당 역할 조합의 기록이 없습니다.</p>}
            </div>
          </StatsScrollArea>
          <SynergyRing peer={selectedPeer} relation={relation} />
          </div>
        </> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">상대별 전적은 클랜의 관계 통계 열람 권한에 따라 제공됩니다.</p>}
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="점수 이력" help="경기 당시 저장된 점수를 실제 경기 날짜 순서로 표시합니다. 선 위에 마우스를 올리거나 방향키로 날짜별 값을 확인하세요. 저장되지 않은 점수는 연결하지 않습니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><FilterButtons label="점수 종류" options={[{ id: "evaluation", label: "평가 점수" }, { id: "analysis", label: "분석 점수" }]} value={scoreKind} onChange={setScoreKind} />{scoreKind === "evaluation" && model.permissions.editMscore && <StatsScoreEditor key={periodKey + person.userId} gameSlug={gameSlug} clanId={clanId} playerId={person.userId} matches={matches} />}</div>
        <StatsTimeChart key={scoreKind} label="점수 이력 그래프" unit="점" lines={[{ label: scoreKind === "evaluation" ? "평가 점수" : "분석 점수", color: "var(--primary)", points: scorePoints }]} empty="저장된 점수 이력이 없습니다." />
      </CardContent></Card>
      <Card size="sm"><CardHeader><CardTitle><StatTitle title="승부예측 기록" help="무효 경기를 제외한 예측의 적중 확률입니다. 본인과 운영진에게 실제 정산 포인트의 일별 누적 흐름을 표시합니다." /></CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground tabular-nums" aria-label="승부예측 요약"><span>예측 참여 {picks.length}회</span><span>적중 {correct}회</span><span>실패 {incorrect}회</span><strong className="text-foreground">적중력 {rate(predictionRate)}</strong><span>무승부 적중 {picks.filter((pick) => pick.outcome === "draw" && pick.result === "correct").length}회 · 무효 {picks.filter((pick) => pick.result === "void").length}회</span></div>
        {canViewPredictionPoints && <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums"><span className="text-emerald-400">수익 +{earned.toLocaleString()}pt</span><span className="text-rose-400">손실 −{lost.toLocaleString()}pt</span><strong>순수익 {earned - lost > 0 ? "+" : ""}{(earned - lost).toLocaleString()}pt</strong></div>}
        {canViewPredictionPoints ? <><p className="text-xs text-muted-foreground">획득·차감 포인트를 반영한 일별 누적 흐름</p><StatsSignedTrendChart label="승부예측 누적 포인트 그래프" unit="pt" points={predictionTrend} empty="선택한 기간에 승부예측 기록이 없습니다." /></> : <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">포인트 수익·손실은 본인과 운영진만 볼 수 있습니다.</p>}
      </CardContent></Card>
    </div>
  );
}
