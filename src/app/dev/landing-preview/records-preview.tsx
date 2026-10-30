import { ClanStatsArchive } from "@/components/main-clan/clan-stats-archive";
import { StatsTrend } from "@/components/main-clan/clan-stats-charts";
import { StatsDonut } from "@/components/main-clan/stats-donut";
import type { ClanArchiveMatch } from "@/lib/clan/stats/load-clan-stats";
import { PreviewPagination } from "./preview-pagination";
import styles from "./preview.module.css";

const trend = [24, 32, 28, 36].map((value, i) => ({ key: `2026-${i + 7}`, label: `${i + 7}월`, value }));
const maps = [
  { name: "부산", value: 48, image: "/images/overwatch/maps/busan.webp" },
  { name: "왕의 길", value: 42, image: "/images/overwatch/maps/kings-row.webp" },
  { name: "리장 타워", value: 30, image: "/images/overwatch/maps/lijiang-tower.webp" },
];
const roles = [
  { name: "탱커", value: 12, wins: 9, draws: 0, losses: 3, rate: 75 },
  { name: "딜러", value: 8, wins: 5, draws: 0, losses: 3, rate: 62.5 },
  { name: "힐러", value: 4, wins: 2, draws: 0, losses: 2, rate: 50 },
];

export function RecordsPreview({ records }: { records: ClanArchiveMatch[] }) {
  return <PreviewPagination label="기록과 통계" slides={[
    { id: "archive", label: "경기 기록", content: <>
      <div className={styles.archive}><ClanStatsArchive archive={{ datesKst: ["2026-10-30"], sampleByDate: { "2026-10-30": records } }} /></div>
      <p className={styles.exampleNote}>예시 기록 · 경기 넘김과 멤버별 정렬을 체험해 보세요.</p>
    </> },
    { id: "trend", label: "월별 추이", content: <figure className={styles.trendExample}>
      <div className={styles.exampleHeading}><strong>우리 클랜의 활동 추이</strong><span>2026년 7–10월</span></div>
      <dl className={styles.statsTotals}>
        <div><dt>개최 내전</dt><dd>24<span>회</span></dd></div>
        <div><dt>완료 경기</dt><dd>120<span>경기</span></dd></div>
        <div><dt>출전 멤버</dt><dd>18<span>명</span></dd></div>
      </dl>
      <StatsTrend points={trend} label="완료 경기" unit="경기" />
      <figcaption>예시 통계 · 월별 경기 수를 마우스나 방향키로 살펴보세요.</figcaption>
    </figure> },
    { id: "maps", label: "맵별 경기", content: <figure className={styles.trendExample}>
      <div className={styles.exampleHeading}><strong>우리가 자주 만난 전장</strong><span>2026년 7–10월</span></div>
      <div className={styles.donutPreview}><StatsDonut rows={maps} label="맵별 경기" unit="경기" showImages horizontal /></div>
      <figcaption>예시 통계 · 맵별 경기 수와 비중을 비교해 보세요.</figcaption>
    </figure> },
    { id: "personal", label: "개인 성적", content: <figure className={styles.trendExample}>
      <div className={styles.exampleHeading}><strong>여울의 역할별 성적</strong><span>2026년 7–10월</span></div>
      <dl className={styles.statsTotals}>
        <div><dt>출전 경기</dt><dd>24<span>경기</span></dd></div>
        <div><dt>승리</dt><dd>16<span>승</span></dd></div>
        <div><dt>승률</dt><dd>66.7<span>%</span></dd></div>
      </dl>
      <div className={styles.donutPreview}><StatsDonut rows={roles} label="역할별 성적" unit="경기" mapResults horizontal preserveOrder /></div>
      <figcaption>예시 통계 · 역할별 출전 횟수와 승률을 살펴보세요.</figcaption>
    </figure> },
  ]} />;
}
