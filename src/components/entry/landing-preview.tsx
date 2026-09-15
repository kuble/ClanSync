"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./entry.module.css";

const previews = [
  { image: "/previews/clan-dashboard-shot.svg", label: "클랜 대시보드" },
  { image: "/previews/game-dashboard-shot.svg", label: "게임 대시보드" },
];

export function LandingPreview() {
  const [active, setActive] = useState(0);
  const preview = previews[active];
  return (
    <div className={styles.previewWindow} aria-label="서비스 화면 미리보기">
      <div className={styles.previewHead}>
        <span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span>
        <span>ClanSync / {preview.label}</span>
      </div>
      <div className={styles.previewBody}>
        <figure className={styles.previewFrame}>
          <Image className={styles.previewImage} src={preview.image} width={1260} height={540} alt={`${preview.label} 화면 예시`} unoptimized />
          <figcaption className={styles.previewCaption}><span>{preview.label} · 화면 예시</span><span>예시 데이터로 구성한 미리보기입니다.</span></figcaption>
        </figure>
      </div>
      <div className={styles.previewTabs} aria-label="미리보기 화면 선택">
        {previews.map((item, index) => <button type="button" key={item.image} aria-label={`${item.label} 미리보기`} aria-pressed={active === index} onClick={() => setActive(index)} />)}
      </div>
    </div>
  );
}
