"use client";

import { useState } from "react";
import { Shield, Check } from "lucide-react";
import { BANNER_RARITIES, NORMAL_CLAN_BANNERS, type ClanBannerSelection } from "@/lib/clan/banner-catalog";
import { ClanBannerArtwork } from "./clan-banner-artwork";
import { CosmeticColorPicker } from "./cosmetic-color-picker";
import styles from "./clan-banner-studio.module.css";

export function ClanBannerStudio({ initialSelection }: { initialSelection: ClanBannerSelection }) {
  const [selection, setSelection] = useState(initialSelection);
  const design = NORMAL_CLAN_BANNERS.find(item => item.id === selection.designId) ?? NORMAL_CLAN_BANNERS[0];

  function select(next: ClanBannerSelection) {
    setSelection(next);
    const url = new URL(window.location.href);
    url.searchParams.set("design", next.designId);
    url.searchParams.set("palette", next.paletteId);
    window.history.replaceState(null, "", url);
  }

  return <main className={styles.page}>
    <header className={styles.header}><div><p>ClanSync · 개발 미리보기</p><h1>클랜 배너 스튜디오</h1></div><span>노말 10종 · 색상 6종</span></header>
    <div className={styles.layout}>
      <section className={styles.previewPanel} aria-label="선택한 배너">
        <div className={styles.hero} aria-label="클랜 배너 미리보기">
          <ClanBannerArtwork selection={selection} />
          <span className={styles.rarity}>{BANNER_RARITIES[design.rarity].label}</span>
          <div className={styles.identity}><span className={styles.icon}><Shield size={28} aria-hidden="true" /></span><div><h2>우리 클랜</h2><p>함께 만드는 순간</p></div></div>
        </div>
        <div className={styles.controls}><div><p className={styles.eyebrow}>{design.pattern}</p><h2>{design.name}</h2></div>
          <CosmeticColorPicker value={selection.paletteId} onChange={paletteId => select({ ...selection, paletteId })} />
          <p className={styles.notice}>색상을 선택하면 같은 패턴의 색만 바뀝니다. 구매·보유 내역에는 반영되지 않는 제작 미리보기입니다.</p>
        </div>
      </section>
      <section className={styles.catalog} aria-label="노말 패턴 선택">
        <div className={styles.catalogHeading}><h2>패턴</h2><span>10종</span></div>
        <div className={styles.grid}>
          {NORMAL_CLAN_BANNERS.map((item, index) => <button type="button" key={item.id} className={styles.design} aria-label={item.name} aria-pressed={selection.designId === item.id} onClick={() => select({ ...selection, designId: item.id })}>
            <span className={styles.thumbnail}><ClanBannerArtwork selection={{ designId: item.id, paletteId: selection.paletteId }} /></span>
            <span className={styles.designLabel}><span><small>{String(index + 1).padStart(2, "0")}</small>{item.name}</span>{selection.designId === item.id ? <Check size={15} aria-hidden="true" /> : null}</span>
          </button>)}
        </div>
      </section>
    </div>
  </main>;
}
