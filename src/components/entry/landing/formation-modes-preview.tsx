import { useTranslator } from "#use-translator";
import { FormationExample, HeroBanExample, PredictionExample } from "./formation-examples";
import { PreviewPagination } from "./preview-pagination";
import { ShowcaseFrame } from "./showcase-frame";
import styles from "./showcase.module.css";

export function FormationModesPreview() {
  const tx = useTranslator();
  return <PreviewPagination label={tx("내전 기능")} slides={[
    { id: "formation", label: "내전 편성", content: <ShowcaseFrame title={tx("우리 클랜에 맞게 팀을 나눕니다.")} description={tx("주장 지명·팀원 경매·역할별 추첨·자동 배정으로 편성할 수 있습니다.")}><div className={styles.formation}><FormationExample /></div></ShowcaseFrame> },
    { id: "ban", label: "영웅 밴", content: <ShowcaseFrame title={tx("이번 경기의 변수를 함께 정합니다.")} description={tx("팀별 투표로 밴할 영웅을 정하고, 새로운 조합으로 겨뤄보십시오.")}><div className={styles.ban}><HeroBanExample /></div></ShowcaseFrame> },
    { id: "prediction", label: "승부 예측", content: <ShowcaseFrame title={tx("관전자도 함께 즐기는 내전.")} description={tx("블루 승·레드 승·무승부를 예측하며 경기의 재미를 더합니다.")}><div className={styles.prediction}><PredictionExample /></div></ShowcaseFrame> },
  ]} />;
}
