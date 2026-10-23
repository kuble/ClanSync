"use client";

import { useId, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { saveProfileIntroAction } from "@/app/actions/profile-intro";
import { Button } from "@/components/ui/button";
import styles from "./profile-intro.module.css";

export function ProfileIntro({ initialIntro }: { initialIntro: string }) {
  const inputId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [intro, setIntro] = useState(initialIntro);
  const [draft, setDraft] = useState(initialIntro);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  function beginEditing() {
    setDraft(intro);
    setError("");
    setStatus("");
    setEditing(true);
  }

  function finishEditing() {
    setEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await saveProfileIntroAction(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIntro(result.intro);
      setDraft(result.intro);
      setStatus("소개를 저장했습니다.");
      finishEditing();
    } catch {
      setError("소개를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.intro}>
      {editing ? (
        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className={styles.form}>
          <label htmlFor={inputId} className={styles.label}>한 줄 소개</label>
          <textarea
            id={inputId}
            className={styles.input}
            value={draft}
            maxLength={120}
            rows={3}
            autoFocus
            disabled={saving}
            aria-invalid={Boolean(error)}
            aria-describedby={`${inputId}-count${error ? ` ${inputId}-error` : ""}`}
            onChange={(event) => setDraft(event.target.value.replace(/[\r\n]+/g, " "))}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || saving) return;
              if (event.key === "Escape") {
                event.preventDefault();
                finishEditing();
              } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void save();
              }
            }}
          />
          <div className={styles.formFooter}>
            <span id={`${inputId}-count`} className={styles.count}>{draft.length} / 120자</span>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" disabled={saving} onClick={finishEditing}>취소</Button>
              <Button type="submit" disabled={saving}>{saving ? "저장 중…" : "소개 저장"}</Button>
            </div>
          </div>
          {error && <p id={`${inputId}-error`} className={styles.error} role="alert">{error}</p>}
        </form>
      ) : (
        <div className={styles.summary}>
          {intro && <p className={styles.text}>{intro}</p>}
          <Button
            ref={editButtonRef}
            type="button"
            variant="ghost"
            size={intro ? "icon" : "default"}
            className={intro ? styles.editButton : styles.emptyButton}
            aria-label={intro ? "한 줄 소개 편집" : "한 줄 소개를 남겨보세요"}
            onClick={beginEditing}
          >
            <Pencil aria-hidden="true" />
            {!intro && "한 줄 소개를 남겨보세요"}
          </Button>
        </div>
      )}
      <span role="status" className="sr-only">{status}</span>
    </div>
  );
}
