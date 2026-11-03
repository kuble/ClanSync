import { notFound } from "next/navigation";
import { CalendarDays, CalendarRange, Crown, Flag, Layers3, ShieldCheck, Swords, Trophy } from "lucide-react";
import styles from "./preview.module.css";

const stats = [
  { label: "정규 내전", value: "295", unit: "회", icon: Swords },
  { label: "개최일", value: "272", unit: "일", icon: CalendarDays },
  { label: "전체 경기", value: "1,280", unit: "경기", icon: Layers3 },
];
const versions = [
  ["아이콘 요약 바", "좁은 높이에 기간과 세 지표를 담고, 등재 기준은 아래에 분리합니다."],
  ["기록 전광판", "세 숫자를 같은 크기로 강조해 각각의 규모가 먼저 보입니다."],
  ["경기 중심", "전체 경기 수를 크게 두고, 내전 횟수와 개최일을 보조 지표로 묶습니다."],
  ["랭킹 입장권", "왼쪽은 집계 기록, 오른쪽은 순위에 오르기 위한 출전 조건입니다."],
  ["순위 기준 먼저", "몇 경기부터 순위에 오르는지 먼저 보여주고, 집계 규모는 아래에 둡니다."],
];
function Period() { return <span className={styles.period}><CalendarRange />전체 기간</span>; }
function Metrics({ indices = [0, 1, 2] }: { indices?: number[] }) {
  return <dl className={styles.metrics}>{indices.map(i => {
    const { label, value, unit, icon: Icon } = stats[i];
    return <div key={label}><dt><Icon />{label}</dt><dd>{value}<small>{unit}</small></dd></div>;
  })}</dl>;
}
function Rule() { return <div className={styles.rule}><ShieldCheck /><span>등재 기준</span><strong>30경기 이상 출전</strong></div>; }
export default function Preview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className={styles.page}>
    <header><span className={styles.kicker}>클랜 통계 / 명예의 전당</span><h1>승률 요약 디자인 비교</h1>
      <p>같은 전체 기간 기록을 다섯 가지 배치로 비교해 보세요.</p></header>
    {versions.map(([title, note], i) => <section key={title} className={styles.sample}>
      <h2><span>0{i + 1}</span>{title}</h2><p>{note}</p>
      <article className={styles.card}><h3><Trophy />승률</h3>
        {i === 0 && <div className={styles.bar}><div className={styles.line}><Period /><Metrics /></div><Rule /></div>}
        {i === 1 && <div className={styles.score}><Period /><Metrics /><Rule /></div>}
        {i === 2 && <div className={styles.hero}><div className={styles.lead}><Period /><Metrics indices={[2]} /></div><div className={styles.side}><Metrics indices={[0,1]} /><Rule /></div></div>}
        {i === 3 && <div className={styles.ticket}><div><Period /><Metrics /></div><div className={styles.stub}><Flag /><span>최소 출전 기준</span><strong>30<small>경기 이상</small></strong></div></div>}
        {i === 4 && <div className={styles.criteria}><div className={styles.line}><Rule /><Period /></div><Metrics /></div>}
        <div className={styles.winner}><span className={styles.rank}><Crown />01</span><span><b>QALeader01#1001</b><small>626승 / 69무 / 395패 · 1,090경기</small></span><strong>57.4%</strong></div>
      </article>
    </section>)}
  </main>;
}
