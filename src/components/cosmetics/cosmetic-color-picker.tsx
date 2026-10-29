"use client";

import { useId, type CSSProperties } from "react";
import { COSMETIC_COLOR_PRESETS, type CosmeticColorPresetId } from "@/lib/cosmetics/color-presets";
import styles from "./cosmetic-color-picker.module.css";

export function CosmeticColorPicker({ value, onChange }: { value: CosmeticColorPresetId; onChange: (value: CosmeticColorPresetId) => void }) {
  const name = useId();
  const selected = COSMETIC_COLOR_PRESETS.find(item => item.id === value) ?? COSMETIC_COLOR_PRESETS[0];
  return <fieldset className={styles.picker}>
    <legend>색상 <strong>{selected.name}</strong></legend>
    <div className={styles.options}>
      {COSMETIC_COLOR_PRESETS.map(palette => <label key={palette.id} className={styles.option} title={palette.name}>
        <input type="radio" name={name} value={palette.id} checked={value === palette.id} onChange={() => onChange(palette.id)} aria-label={palette.name} />
        <span className={styles.swatch} aria-hidden="true" style={{ "--swatch": palette.swatch } as CSSProperties} />
      </label>)}
    </div>
  </fieldset>;
}
