import { Crown, Gavel, Shuffle, ListOrdered, Flag, Swords } from "lucide-react";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import { PreviewPagination } from "./preview-pagination";
import styles from "./formation-modes-preview.module.css";

const modes = [
  { title: "주장 지명", icon: Crown, text: "양 팀 주장이 차례로 팀원을 고르며 팀을 완성해요." },
  { title: "팀원 경매", icon: Gavel, text: "정해진 크레딧 안에서 입찰하며 원하는 팀원을 영입해요." },
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
        <div className={styles.auctionBody}>
          <div className={styles.credits}><div data-team="blue"><span>블루 팀</span><strong>1,000 <small>cr</small></strong></div><Gavel size={22} aria-hidden /><div data-team="red"><span>레드 팀</span><strong>1,000 <small>cr</small></strong></div></div>
          <div className={styles.player}><span className={styles.avatar}><OverwatchRoleIcon role="damage" /></span><small>이번에 영입할 멤버</small><h3>루나</h3><p>공격</p></div>
          <div className={styles.bid}><span>현재 최고 입찰 <b>블루 팀</b></span><strong>260 <small>cr</small></strong></div>
          <p className={styles.hint}>누구와 함께할지, 주장들의 선택이 시작됩니다.</p>
        </div>
        <figcaption>기능을 압축한 예시 · 가상 데이터</figcaption>
      </figure> },
      { id: "prediction", label: "승부 예측", content: <figure className={styles.window}>
        <header><span>관전자 승부 예측</span><span className={styles.badge}>예측 현황 · 예시</span></header>
        <div className={styles.predictionBody}>
          <Swords size={28} aria-hidden /><h3>이번 경기는 누가 이길까요?</h3><p>블루 승 · 레드 승 · 무승부</p>
          <div className={styles.pool}><span>전체 예측 풀</span><strong>1,000 <small>코인</small></strong></div>
          <div className={styles.choices}>{[{ label: "블루 승", coins: 600, team: "blue" }, { label: "레드 승", coins: 300, team: "red" }, { label: "무승부", coins: 100, team: "draw" }].map(choice => <div key={choice.team} data-team={choice.team}><span>{choice.label}</span><strong>{choice.coins}</strong><small>코인</small></div>)}</div>
          <p className={styles.hint}>관전자 8명이 함께 예측하고 있어요.</p>
        </div>
        <figcaption>기능을 압축한 예시 · 가상 데이터</figcaption>
      </figure> },
    ]} />
  </div>;
}
