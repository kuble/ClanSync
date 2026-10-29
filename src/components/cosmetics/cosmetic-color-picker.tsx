"use client";

import { useId, type CSSProperties } from "react";
import { COSMETIC_COLOR_PRESETS, type CosmeticColorPresetId } from "@/lib/cosmetics/color-presets";
import styles from "./cosmetic-color-picker.module.css";

type PickerProps = { disabled?: boolean; compact?: boolean; label?: string } & (
  { allowDefault: true; value: CosmeticColorPresetId | null; onChange: (value: CosmeticColorPresetId | null) => void }
  | { allowDefault?: false; value: CosmeticColorPresetId; onChange: (value: CosmeticColorPresetId) => void }
);

export function CosmeticColorPicker(props: PickerProps) {
  const { value, onChange, disabled = false, compact = false, label = "색상" } = props;
  const name = useId();
  const selected = COSMETIC_COLOR_PRESETS.find(item => item.id === value);
  return <fieldset className={compact ? `${styles.picker} ${styles.compact}` : styles.picker} disabled={disabled}>
    <legend className={compact ? "sr-only" : undefined}>{label} <strong>{selected?.name ?? "기본"}</strong></legend>
    <div className={styles.options}>
      {props.allowDefault && <label className={styles.option} title="기본"><input type="radio" name={name} value="default" checked={value === null} onChange={() => props.onChange(null)} aria-label="기본" /><span className={styles.swatch} aria-hidden="true" style={{ "--swatch": "var(--foreground)" } as CSSProperties} /></label>}
      {COSMETIC_COLOR_PRESETS.map(palette => <label key={palette.id} className={styles.option} title={palette.name}>
        <input type="radio" name={name} value={palette.id} checked={value === palette.id} onChange={() => onChange(palette.id)} aria-label={palette.name} />
        <span className={styles.swatch} aria-hidden="true" style={{ "--swatch": palette.swatch } as CSSProperties} />
      </label>)}
    </div>
  </fieldset>;
}
