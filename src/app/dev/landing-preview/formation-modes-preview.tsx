import { Crown, Gavel, Shuffle, ListOrdered, Flag } from "lucide-react";
import { AuctionExample, PredictionExample } from "./formation-examples";
import { PreviewPagination } from "./preview-pagination";
import styles from "./formation-modes-preview.module.css";

const modes = [
  { title: "주장 지명", icon: Crown, text: "양 팀 주장이 차례로 팀원을 고르며 팀을 완성해요." },
  { title: "팀원 경매", icon: Gavel, text: "정해진 포인트 안에서 입찰하며 원하는 팀원을 영입해요." },
  { title: "역할별 추첨", icon: Shuffle, text: "정해진 역할은 유지하고, 같은 역할의 멤버끼리 팀을 추첨해요." },
  { title: "자동 배정", icon: ListOrdered, text: "선호 역할과 추첨 순서에 따라 멤버의 역할을 배정해요." },
];

export function FormationModesPreview() {
  return <div className={styles.layout}>
    <div className={styles.copy}>
      <dl className={styles.modes}>{modes.map(({ title, icon: Icon, text }) => <div key={title}>
        <dt><Icon size={19} aria-hidden />{title}</dt><dd>{text}</dd>
      </div>)}</dl>
      <div className={styles.predictionCopy}><h3><Flag size={19} aria-hidden />관전자도 함께하는 승부 예측</h3><p>출전하지 않는 멤버도 경기 결과를 예상하며 내전을 함께 즐겨요.</p></div>
    </div>
    <PreviewPagination label="편성과 예측 미리보기" slides={[
      { id: "auction", label: "팀원 경매", content: <figure className={styles.window}>
        <header><span>팀원 경매</span><span className={styles.badge}>입찰 중 · 예시</span></header>
        <div className={styles.actual}><AuctionExample /></div>
        <figcaption>실제 서비스 UI · 예시 데이터 · 읽기 전용</figcaption>
      </figure> },
      { id: "prediction", label: "승부 예측", content: <figure className={styles.window}>
        <header><span>관전자 승부 예측</span><span className={styles.badge}>예측 현황 · 예시</span></header>
        <div className={styles.actual}><PredictionExample /></div>
        <figcaption>실제 서비스 UI · 예시 데이터 · 읽기 전용</figcaption>
      </figure> },
    ]} />
  </div>;
}
