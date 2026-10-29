"use client";
import { StatHelp, StatTooltip } from "@/components/main-clan/stat-help";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button-variants";
import { Check, Info, Pencil, ShoppingBag } from "lucide-react";
import { saveNamecardThemeAction, saveNameplateSelectionAction } from "@/app/actions/profile-decorations";
import { NAMECARD_THEMES, namecardThemeSelections, namecardAppearance, type NamecardAppearance, type NamecardCategory, type NamecardOption, type NamecardResult, type NamecardState } from "@/lib/profile/namecard";
import { CLANSYNC_NAMEPLATE_CHANGED } from "@/lib/profile-decoration-sync";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Namecard } from "./namecard";
import styles from "./namecard.module.css";

const CATEGORIES: [NamecardCategory | "theme", string][] = [["theme", "테마"], ["emblem", "심벌"], ["portrait", "초상 프레임"], ["namebar", "배경"], ["frame", "카드 프레임"], ["sub", "칭호"]];

export function ProfileNamecard({ initial, displayName, children }: {
  initial: NamecardResult; displayName: string; children: (appearance: NamecardAppearance, tools?: ReactNode) => ReactNode;
}) {
  const [state, setState] = useState(initial.ok ? initial.state : null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const firstOption = useRef<HTMLButtonElement>(null);
  const [category, setCategory] = useState<NamecardCategory | "theme">("emblem");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    if (initial.ok) setState(initial.state);
    else setError(initial.error);
  }
  if (!state) return <section aria-label="공통 네임카드"><p role="alert" className={styles.error}>{!initial.ok ? initial.error : "네임카드를 불러오지 못했습니다."}</p>{children(namecardAppearance([], []))}</section>;
  const appearance = namecardAppearance(state.catalog, state.selections);
  const label = CATEGORIES.find(([key]) => key === category)![1];
  function options(category: NamecardCategory) {
    const unique = new Map<string, NamecardOption>();
    for (const option of state!.catalog.filter((item) => item.category === category && (item.unlock_source === "default" || state!.owned.includes(item.id)))) {
      const key = option.name_ko;
      if (!unique.has(key) || state!.selections.some((item) => item.option_id === option.id)) unique.set(key, option);
    }
    return [...unique.values()];
  }
  const available = category === "theme" ? [] : options(category);
  const selectedId = state.selections.find(selection => selection.category === category)?.option_id ?? available[0]?.id;
  async function equip(selections: NamecardState["selections"], themeId?: string) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(""); setStatus("");
    try {
      const result = themeId ? await saveNamecardThemeAction(themeId) : await saveNameplateSelectionAction({ category: selections[0].category, optionId: selections[0].option_id });
      if (!result.ok) { setError("네임카드를 저장하지 못했습니다. 다시 시도해 주십시오."); return; }
      setState((previous) => previous && ({ ...previous, selections: [...previous.selections.filter((item) => !selections.some(next => next.category === item.category)), ...selections] }));
      setStatus("공통 네임카드를 저장했습니다.");
      window.dispatchEvent(new CustomEvent(CLANSYNC_NAMEPLATE_CHANGED));
    } catch { setError("네임카드를 저장하지 못했습니다. 다시 시도해 주십시오."); }
    finally { busy.current = false; setPending(false); }
  }
  const tools = <div className={styles.actions} role="toolbar" aria-label="네임카드 도구">
      <Tooltip><TooltipTrigger render={<Link href="/store" aria-label="개인 상점" className={buttonVariants({ variant: "outline", size: "icon" })} />}><ShoppingBag aria-hidden="true" /></TooltipTrigger><TooltipContent role="tooltip">개인 상점</TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger render={<Button size="icon" aria-label="네임카드 꾸미기" onClick={() => { setError(""); setOpen(true); }} />}><Pencil aria-hidden="true" /></TooltipTrigger><TooltipContent role="tooltip">네임카드 꾸미기</TooltipContent></Tooltip>
    </div>;
  return <section aria-label="공통 네임카드">
    <div className={styles.header}><h2 aria-label="게임 프로필"><StatHelp title="게임 프로필">한 번 꾸미면 모든 게임에서 함께 사용합니다.</StatHelp></h2></div>
    {children(appearance, tools)}
    <Sheet open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <SheetContent initialFocus={firstOption} showCloseButton={!pending} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[680px]">
        <SheetHeader className="shrink-0"><SheetTitle>네임카드 꾸미기</SheetTitle><SheetDescription>디자인을 누르면 모든 게임에 바로 적용됩니다.</SheetDescription></SheetHeader>
        <section className={styles.editorPreview} aria-label="현재 네임카드"><p>현재 적용 모습</p><Namecard displayName={displayName} {...appearance} /></section>
        <div className={styles.categories} role="group" aria-label="네임카드 꾸미기 분류">
          {CATEGORIES.map(([key, name], index) => <button key={key} ref={index === 0 ? firstOption : undefined} type="button" aria-pressed={category === key} disabled={pending} onClick={() => setCategory(key)}>{name}</button>)}
        </div>
        <div className={styles.fields} aria-busy={pending}>
          <div className={styles.designHeading}><h3>{label} 디자인</h3><span>{category === "theme" ? "심벌·칭호는 유지" : `보유 ${available.length}`}</span></div>
          {category === "theme" ? <div className={styles.themeGrid} role="group" aria-label="네임카드 테마 디자인">
            {!NAMECARD_THEMES.length && <p className={styles.note}>등록된 테마가 없습니다.</p>}
            {NAMECARD_THEMES.map(theme => {
              const selections = namecardThemeSelections(state.catalog, theme.id);
              const ready = selections.length === 3 && selections.every(selection => options(selection.category).some(option => option.id === selection.option_id));
              const selected = ready && selections.every(selection => state.selections.some(item => item.category === selection.category && item.option_id === selection.option_id));
              const preview = namecardAppearance(state.catalog, [...state.selections.filter(item => !selections.some(next => next.category === item.category)), ...selections]);
              return <button key={theme.id} type="button" className={styles.designOption} aria-label={`${theme.name} 테마 적용`} aria-pressed={selected} disabled={pending || !ready} onClick={() => { if (!selected) void equip(selections, theme.id); }}>
                <span aria-hidden="true"><Namecard displayName={displayName} {...preview} /></span>
                <span className={styles.designCaption}><span><strong>{theme.name}</strong><small>{theme.description}</small></span><span>{selected ? <><Check size={14} aria-hidden="true" />적용 중</> : ready ? "세트 적용" : "사용 불가"}</span></span>
              </button>;
            })}
          </div> : <div className={styles.designGrid} role="group" aria-label={`네임카드 ${label} 디자인`}>
            {available.map(item => {
              const selected = selectedId === item.id;
              const name = category === "sub" && item.code.endsWith("-sub-default") ? "칭호 없음" : item.name_ko;
              const preview = namecardAppearance(state.catalog, [...state.selections.filter(selection => selection.category !== category), { category, option_id: item.id }]);
              return <button key={item.id} type="button" className={styles.designOption} aria-label={`${label} ${name} 적용`} aria-pressed={selected} disabled={pending} onClick={() => { if (!selected) void equip([{ category, option_id: item.id }]); }}>
                <span aria-hidden="true"><Namecard displayName={displayName} compact {...preview} /></span>
                <span className={styles.designCaption}><strong>{name}</strong><span>{selected ? <><Check size={14} aria-hidden="true" />적용 중</> : "선택"}</span></span>
              </button>;
            })}
          </div>}
          <div className={styles.editorTools} role="group" aria-label="꾸미기 안내">
            <StatTooltip label="디자인 선택 안내" description="보유한 디자인을 실제 네임카드 모습으로 비교할 수 있습니다. 디자인을 누르면 모든 게임에 바로 적용됩니다." className={buttonVariants({ variant: "ghost", size: "icon" })}><Info aria-hidden="true" /></StatTooltip>
            <Tooltip><TooltipTrigger render={<Link href="/store" aria-label="개인 상점에서 더 보기" className={buttonVariants({ variant: "ghost", size: "icon" })} />}><ShoppingBag aria-hidden="true" /></TooltipTrigger><TooltipContent>개인 상점에서 더 보기</TooltipContent></Tooltip>
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <p role="status" className={styles.note}>{pending ? "네임카드를 저장하는 중…" : status}</p>
        </div>
      </SheetContent>
    </Sheet>
    <p role="status" className={styles.note}>{!open ? status : ""}</p>
  </section>;
}
