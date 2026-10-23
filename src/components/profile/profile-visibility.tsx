"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { saveProfileVisibilityAction } from "@/app/actions/profile-visibility";
import type { ProfileVisibility as Visibility } from "@/lib/profile/visibility";
import { Switch } from "@/components/ui/switch";
import { buttonVariants } from "@/components/ui/button-variants";
import styles from "./profile.module.css";

const FIELDS = [
  ["show_intro", "한 줄 소개", "프로필에 적은 소개를 보여줍니다."],
  ["show_games", "플레이 게임", "연결한 게임 이름을 보여줍니다. 게임 계정 ID는 공개하지 않습니다."],
  ["show_clan", "함께하는 클랜", "활동 중인 클랜과 역할을 보여줍니다."],
  ["show_emblems", "대표 엠블럼", "클랜 정보 공개 시, 같은 클랜 멤버에게 보여줍니다."],
] as const;

export function ProfileVisibility({ initial, userId, loadFailed = false }: { initial: Visibility; userId: string; loadFailed?: boolean }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  async function change(key: keyof Visibility, checked: boolean) {
    if (busy.current || loadFailed) return;
    busy.current = true;
    setSaving(true); setError(""); setStatus("");
    const next = { ...value, [key]: checked };
    try {
      const result = await saveProfileVisibilityAction(next);
      if (result.ok) { setValue(result.visibility); setStatus("공개 설정을 저장했습니다."); }
      else setError(result.error);
    } catch { setError("공개 설정을 저장하지 못했습니다. 다시 시도해 주세요."); }
    finally { busy.current = false; setSaving(false); }
  }
  return <section className={styles.accountSection} aria-labelledby="visibility-title" aria-busy={saving}>
    <div className={styles.sectionHeader}><div><h2 id="visibility-title" className={styles.sectionHeading}>프로필 공개 설정</h2><p className={styles.sectionText}>방문자에게 보여줄 정보를 선택하세요. 계정 정보는 항상 나만 볼 수 있습니다.</p></div></div>
    <label className={styles.visibilityRow}><span><strong>미니룸 공개</strong><small>로그인한 다른 플레이어가 내 방을 방문할 수 있습니다.</small></span><Switch aria-label="미니룸 공개" checked={value.room_public} disabled={saving || loadFailed} onChange={(event) => void change("room_public", event.target.checked)} /></label>
    <div className={styles.visibilityFields} data-disabled={!value.room_public}>
      {FIELDS.map(([key, title, description]) => <label key={key} className={styles.visibilityRow}><span><strong>{title}</strong><small>{description}</small></span><Switch aria-label={`${title} 공개`} checked={value[key]} disabled={saving || loadFailed || !value.room_public || (key === "show_emblems" && !value.show_clan)} onChange={(event) => void change(key, event.target.checked)} /></label>)}
    </div>
    {value.room_public && <Link href={`/profile/${userId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>방문 화면 보기</Link>}
    {(error || loadFailed) && <p role="alert" className={styles.error}>{error || "공개 설정을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."}</p>}
    <span role="status" className={styles.sectionText}>{saving ? "저장 중…" : status}</span>
  </section>;
}
