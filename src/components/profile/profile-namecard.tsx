"use client";
import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { saveNameplateSelectionAction } from "@/app/actions/profile-decorations";
import { namecardAppearance, type NamecardCategory, type NamecardOption, type NamecardResult } from "@/lib/profile/namecard";
import { CLANSYNC_NAMEPLATE_CHANGED } from "@/lib/profile-decoration-sync";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Namecard } from "./namecard";
import styles from "./namecard.module.css";

const CATEGORIES: [NamecardCategory, string][] = [["emblem", "엠블럼"], ["namebar", "이름표"], ["sub", "칭호"], ["frame", "프레임"]];

export function ProfileNamecard({ initial }: { initial: NamecardResult }) {
  const [state, setState] = useState(initial.ok ? initial.state : null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    if (initial.ok) setState(initial.state);
    else setError(initial.error);
  }
  if (!state) return <p role="alert" className={styles.error}>{!initial.ok ? initial.error : "네임카드를 불러오지 못했습니다."}</p>;
  const appearance = namecardAppearance(state.catalog, state.selections);
  function options(category: NamecardCategory) {
    const unique = new Map<string, NamecardOption>();
    for (const option of state!.catalog.filter((item) => item.category === category && (item.unlock_source === "default" || state!.owned.includes(item.id)))) {
      const key = option.unlock_source === "default" ? "default" : option.name_ko;
      if (!unique.has(key) || state!.selections.some((item) => item.option_id === option.id)) unique.set(key, option);
    }
    return [...unique.values()];
  }
  async function equip(category: NamecardCategory, optionId: string) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(""); setStatus("");
    try {
      const result = await saveNameplateSelectionAction({ category, optionId });
      if (!result.ok) { setError("네임카드를 저장하지 못했습니다. 다시 시도해 주세요."); return; }
      setState((previous) => previous && ({ ...previous, selections: [...previous.selections.filter((item) => item.category !== category), { category, option_id: optionId }] }));
      setStatus("공통 네임카드를 저장했습니다.");
      window.dispatchEvent(new CustomEvent(CLANSYNC_NAMEPLATE_CHANGED));
    } catch { setError("네임카드를 저장하지 못했습니다. 다시 시도해 주세요."); }
    finally { busy.current = false; setPending(false); }
  }
  return <section aria-label="공통 네임카드">
    <div className={styles.header}><div><h2>내 네임카드</h2><p>한 번 꾸미면 모든 게임에서 함께 사용합니다.</p></div><Button size="sm" onClick={() => { setError(""); setOpen(true); }}><Sparkles size={14} aria-hidden="true" />네임카드 꾸미기</Button></div>
    <div className={styles.preview}><Namecard displayName="Player#1234" {...appearance} /><p className={styles.note}>미리보기용 ID입니다. 클랜에서는 해당 게임의 배틀태그 또는 라이엇 ID를 표시합니다.</p></div>
    <Sheet open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}><SheetContent showCloseButton={!pending} className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[680px]"><SheetHeader><SheetTitle>네임카드 꾸미기</SheetTitle><SheetDescription>보유한 꾸미기를 선택하면 계정 공통으로 바로 저장됩니다.</SheetDescription></SheetHeader><div className={styles.fields}><Namecard displayName="Player#1234" {...appearance} />{CATEGORIES.map(([category, label]) => { const available = options(category); return <label key={category}>{label}<select aria-label={`네임카드 ${label}`} value={state.selections.find((item) => item.category === category)?.option_id ?? available[0]?.id ?? ""} disabled={pending || !available.length} onChange={(event) => void equip(category, event.target.value)}>{available.map((item) => <option key={item.id} value={item.id}>{category === "sub" && item.unlock_source === "default" ? "칭호 없음" : item.name_ko}</option>)}</select></label>; })}{error && <p role="alert" className={styles.error}>{error}</p>}<p role="status" className={styles.note}>{status}</p></div></SheetContent></Sheet>
    <p role="status" className={styles.note}>{!open ? status : ""}</p>
  </section>;
}
