"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Crown, Trophy, MessageSquare, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import { StatsDonut } from "@/components/main-clan/stats-donut";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import { OW_HERO_PORTRAITS } from "@/lib/balance/ow-hero-portraits";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { PreviewPagination } from "./preview-pagination";
import styles from "./stats-preview.module.css";

// Local fictional examples; these compact views never load or edit clan data.
const maps = [
  { name: "부산", value: 48, image: "/images/overwatch/maps/busan.webp" },
  { name: "왕의 길", value: 42, image: "/images/overwatch/maps/kings-row.webp" },
  { name: "리장 타워", value: 30, image: "/images/overwatch/maps/lijiang-tower.webp" },
];
const bans = [
  { name: "캐서디", value: 32, image: OW_HERO_PORTRAITS.cassidy },
  { name: "D.Va", value: 28, image: OW_HERO_PORTRAITS.dva },
  { name: "아나", value: 20, image: OW_HERO_PORTRAITS.ana },
];
const roleResults = [
  { name: "돌격", role: "tank", games: 12, wins: 9, losses: 3, rate: "75.0%" },
  { name: "공격", role: "damage", games: 8, wins: 5, losses: 3, rate: "62.5%" },
  { name: "지원", role: "support", games: 4, wins: 2, losses: 2, rate: "50.0%" },
] as const;
const rankings = {
  "승률": [{ name: "여울", value: "66.7%", detail: "16승 · 8패 · 24경기" }, { name: "루나", value: "62.5%", detail: "15승 · 9패 · 24경기" }, { name: "모카", value: "58.3%", detail: "14승 · 10패 · 24경기" }],
  "참여": [{ name: "하루", value: "24회", detail: "전체 내전 24회 · 참여율 100%" }, { name: "노을", value: "21회", detail: "전체 내전 24회 · 참여율 87.5%" }, { name: "구름", value: "18회", detail: "전체 내전 24회 · 참여율 75%" }],
  "출전": [{ name: "노을", value: "108경기", detail: "전체 120경기 중 출전" }, { name: "하루", value: "96경기", detail: "전체 120경기 중 출전" }, { name: "구름", value: "84경기", detail: "전체 120경기 중 출전" }],
  "예측": [{ name: "모카", value: "18회 적중", detail: "24회 예측 · 적중률 75%" }, { name: "구름", value: "16회 적중", detail: "24회 예측 · 적중률 66.7%" }, { name: "루나", value: "15회 적중", detail: "24회 예측 · 적중률 62.5%" }],
};

function Screen({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <figure className={styles.screen}>
    <header className={styles.heading}><h3>{title}</h3><span>2026년 7–10월</span></header>
    <div className={styles.body}>{children}</div>
    <figcaption>{detail}<span>화면을 압축한 예시 · 가상 데이터</span></figcaption>
  </figure>;
}

function HallPreview() {
  const [ranking, setRanking] = useState<keyof typeof rankings>("승률");
  return <Screen title="함께 만든 우리 클랜의 명예의 전당" detail="승률부터 참여·출전·예측까지, 다양한 활약을 기록해요.">
    <div className={styles.filters} role="group" aria-label="미리보기 순위 부문">{(Object.keys(rankings) as (keyof typeof rankings)[]).map(label => <button key={label} type="button" aria-pressed={ranking === label} onClick={() => setRanking(label)}>{label}</button>)}</div>
    <div className={styles.twoColumns}>
      <section className={styles.card}><h4><Trophy size={16} aria-hidden />{ranking} TOP 3</h4><ol className={styles.rankList}>{rankings[ranking].map((row, index) => <li key={row.name}><span className={styles.rank}><Crown size={15} aria-hidden />0{index + 1}</span><div><strong>{row.name}</strong><small>{row.detail}</small></div><b>{row.value}</b></li>)}</ol></section>
      <section className={styles.card}><h4><MessageSquare size={16} aria-hidden />함께 축하하는 순간</h4><div className={styles.reactions}><p><strong>하루</strong><span>이번 달도 함께해서 즐거웠어요!</span></p><p><strong>노을</strong><span>다음 내전도 기대할게요.</span></p><span className={styles.reaction}>축하해요 · 공감 5</span></div></section>
    </div>
  </Screen>;
}

function MatchPreview({ records }: { records: ClanArchiveMatch[] }) {
  const [index, setIndex] = useState(0);
  const match = records[index];
  const leaders = records[0].players.map(player => {
    const games = records.filter(record => record.players.some(p => p.userId === player.userId));
    const wins = games.filter(record => record.players.find(p => p.userId === player.userId)?.team === record.winnerTeam).length;
    return { ...player, games: games.length, wins, rate: wins / games.length * 100 };
  }).sort((a, b) => b.rate - a.rate).slice(0, 3);
  return <Screen title="한 경기의 팀 구성부터 멤버별 성적까지" detail="경기를 넘기며 함께한 멤버와 결과를 살펴보세요.">
    <div className={styles.summary}><span>2026. 10. 30.</span><span>내전 <b>12회차</b></span><span>참여 <b>10명</b></span><span>기록 <b>3경기</b></span></div>
    <div className={styles.twoColumns}>
      <section className={styles.card}><div className={styles.matchHeading}><h4><MapPin size={15} aria-hidden />{match.mapLabel}</h4><div><button type="button" aria-label="이전 예시 경기" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={17} /></button><span>{index + 1} / {records.length}</span><button type="button" aria-label="다음 예시 경기" disabled={index === records.length - 1} onClick={() => setIndex(index + 1)}><ChevronRight size={17} /></button></div></div>
        <div className={styles.teams}>{([1, 2] as const).map(team => <div key={team} data-team={team}><h5>{team === 1 ? "블루 팀" : "레드 팀"}{match.winnerTeam === team && <span>승리</span>}</h5><ul>{match.players.filter(p => p.team === team).map(p => <li key={p.userId}><OverwatchRoleIcon role={p.role === "tank" ? "tank" : p.role === "dmg" ? "damage" : "support"} /><span>{p.nickname}</span></li>)}</ul></div>)}</div>
      </section>
      <section className={styles.card}><h4><Trophy size={16} aria-hidden />이날의 승률 TOP 3</h4><table className={styles.table}><thead><tr><th>멤버</th><th>승 / 패</th><th>승률</th></tr></thead><tbody>{leaders.map(p => <tr key={p.userId}><th>{p.nickname}</th><td>{p.wins} / {p.games - p.wins}</td><td>{p.rate.toFixed(1)}%</td></tr>)}</tbody></table><p className={styles.footnote}>예시 3경기 기준 · 당일 성적 일부</p></section>
    </div>
  </Screen>;
}

export function RecordsPreview({ records }: { records: ClanArchiveMatch[] }) {
  return <PreviewPagination label="기록과 통계" slides={[
    { id: "hof", label: "명예의 전당", content: <HallPreview /> },
    { id: "clan", label: "클랜 통계", content: <Screen title="우리 클랜은 어떤 경기를 즐길까요?" detail="자주 플레이한 맵, 밴한 영웅, 함께 고른 전장을 한눈에.">
      <div className={styles.summary}><span>개최 내전 <b>24회</b></span><span>완료 경기 <b>120경기</b></span><span>출전 멤버 <b>18명</b></span></div>
      <div className={styles.threeCharts}>{[{ title: "맵별 경기", rows: maps, unit: "경기" }, { title: "영웅 밴", rows: bans, unit: "건" }, { title: "선호 맵", rows: maps.map((m, i) => ({ ...m, value: [96, 80, 64][i] })), unit: "표" }].map(chart => <section key={chart.title} className={styles.card}><h4>{chart.title}</h4><div className={styles.chart}><StatsDonut rows={chart.rows} label={chart.title} unit={chart.unit} showImages /></div></section>)}</div>
    </Screen> },
    { id: "archive", label: "경기 기록", content: <MatchPreview records={records} /> },
    { id: "personal", label: "개인 기록", content: <Screen title="플레이어마다 쌓이는 나만의 기록" detail="프로필과 엠블럼, 역할별 승률과 최근 전적을 함께.">
      <div className={styles.profile}><div><span className={styles.namecard}>여울#1001</span><p>함께 성장하는 클랜원</p></div><div className={styles.emblems}>{["victory", "participation", "appearances"].map((award, i) => <Image key={award} src={`/personal-emblems/v1/awards/month/${award}-gold.png`} alt={["월간 승률 금상", "월간 참여 금상", "월간 출전 금상"][i]} width={70} height={70} />)}</div></div>
      <section className={styles.card}><h4>여울의 역할별 성적</h4><table className={styles.table}><thead><tr><th>역할</th><th>승률</th><th>승 / 패</th><th>경기</th></tr></thead><tbody>{roleResults.map(r => <tr key={r.role}><th><span className={styles.role}><OverwatchRoleIcon role={r.role} />{r.name}</span></th><td>{r.rate}</td><td>{r.wins} / {r.losses}</td><td>{r.games}</td></tr>)}</tbody></table></section>
      <div className={styles.recent}><div><h4>최근 6경기</h4><div className={styles.streak}>{[true, true, false, true, true, true].map((win, i) => <span key={i} data-win={win}>{win ? "승" : "패"}</span>)}</div></div><p>현재 <strong>3연승</strong><span>최장 연승 5경기</span></p></div>
    </Screen> },
    { id: "synergy", label: "맵과 시너지", content: <Screen title="나에게 맞는 전장, 호흡이 맞는 멤버" detail="맵별 승률과 멤버 간 전적을 비교해요.">
      <div className={styles.twoColumns}><section className={styles.card}><h4><MapPin size={16} aria-hidden />여울의 맵별 승률</h4><div className={styles.chart}><StatsDonut rows={maps.map((m, i) => ({ ...m, value: [10, 8, 6][i], wins: [8, 5, 3][i], draws: 0, losses: [2, 3, 3][i], rate: [80, 62.5, 50][i] }))} label="여울의 맵별 승률" unit="경기" showImages mapResults /></div></section>
      <section className={styles.card}><h4><Users size={16} aria-hidden />함께한 멤버와의 시너지</h4><p className={styles.footnote}>여울 · 같은 팀으로 출전한 경기</p><table className={styles.table}><thead><tr><th>멤버</th><th>승 / 패</th><th>승률</th></tr></thead><tbody>{[{name:"하루",wins:8,losses:2},{name:"노을",wins:6,losses:2},{name:"루나",wins:4,losses:2}].map(p => <tr key={p.name}><th>{p.name}</th><td>{p.wins} / {p.losses}</td><td>{(p.wins / (p.wins + p.losses) * 100).toFixed(1)}%</td></tr>)}</tbody></table><div className={styles.partner}><Users size={30} aria-hidden /><div><strong>하루와 함께 80.0%</strong><span>10경기 · 8승 2패</span></div></div></section></div>
    </Screen> },
  ]} />;
}
