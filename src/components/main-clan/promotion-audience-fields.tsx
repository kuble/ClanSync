"use client";

import { useState } from "react";
import { CLAN_STYLES, OVERWATCH_POSITIONS } from "@/lib/clan/recruitment";
import styles from "./clan-promotion-settings.module.css";

type Props = {
  gameSlug: string;
  initialStyle: string | null;
  initialPositions: string[];
  disabled: boolean;
};

export function PromotionAudienceFields({ gameSlug, initialStyle, initialPositions, disabled }: Props) {
  const [positions, setPositions] = useState(initialPositions);

  function togglePosition(position: string) {
    setPositions(current => {
      const next = current.includes(position)
        ? current.filter(value => value !== position)
        : [...current, position];
      return next.length === OVERWATCH_POSITIONS.length ? [] : next;
    });
  }

  return <div className={styles.audienceFields}>
    <label className={styles.styleField}>
      <span>지향</span>
      <select name="style" defaultValue={initialStyle ?? ""} disabled={disabled}>
        <option value="">지향 무관</option>
        {CLAN_STYLES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {gameSlug === "overwatch" && <fieldset disabled={disabled} className={styles.positions} aria-describedby="position-choice-hint">
      <legend>주포지션</legend>
      <span id="position-choice-hint" className={styles.choiceHint}>복수 선택</span>
      <div className={styles.positionToggle}>
        <button type="button" aria-pressed={!positions.length} onClick={() => setPositions([])}>전체</button>
        {OVERWATCH_POSITIONS.map(({ value, label }) => <button key={value} type="button"
          aria-pressed={positions.includes(value)} onClick={() => togglePosition(value)}>{label}</button>)}
      </div>
      {(positions.length ? positions : ["all"]).map(value => <input key={value} type="hidden" name="recruitment_positions" value={value} />)}
    </fieldset>}
  </div>;
}
