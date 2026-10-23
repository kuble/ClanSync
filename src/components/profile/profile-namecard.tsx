"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, ShoppingBag, Sparkles } from "lucide-react";
import { saveNameplateSelectionAction } from "@/app/actions/profile-decorations";
import { purchaseProfileTitleAction } from "@/app/actions/profile-titles";
import { namecardAppearance, type NamecardCategory, type NamecardOption, type NamecardResult } from "@/lib/profile/namecard";
import { CLANSYNC_NAMEPLATE_CHANGED } from "@/lib/profile-decoration-sync";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Namecard } from "./namecard";
import styles from "./namecard.module.css";

const CATEGORIES: [NamecardCategory, string][] = [["emblem", "엠블럼"], ["namebar", "이름표"], ["sub", "칭호"], ["frame", "프레임"]];

export function ProfileNamecard({ initial, shopOnly = false }: { initial: NamecardResult; shopOnly?: boolean }) {
  const [state, setState] = useState(initial.ok ? initial.state : null);
  const [panel, setPanel] = useState<"edit" | "shop" | null>(null);
  const [purchase, setPurchase] = useState<NamecardOption | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();
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
  async function buy() {
    if (!purchase || busy.current) return;
    busy.current = true; setPending(true); setError(""); setStatus("");
    try {
      const result = await purchaseProfileTitleAction(purchase.id);
      if (!result.ok) { setError(result.error); return; }
      setState((previous) => previous && ({ ...previous, coinBalance: result.coinBalance, owned: [...new Set([...previous.owned, result.optionId])] }));
      setPurchase(null); setStatus("칭호를 구매했습니다. 사용하기를 눌러 네임카드에 달아보세요.");
      if (shopOnly) router.refresh();
    } catch { setError("구매 결과를 확인하지 못했습니다. 다시 시도해도 중복 차감되지 않습니다."); }
    finally { busy.current = false; setPending(false); }
  }
  const shop = <div className={styles.shop}>{state.catalog.filter((item) => item.category === "sub" && item.price_coins > 0).map((item) => {
    const owned = state.owned.includes(item.id), equipped = state.selections.some((selected) => selected.option_id === item.id);
    return <article key={item.id} aria-label={item.name_ko} className={styles.item}><div><strong>{item.name_ko}</strong><p>{item.price_coins.toLocaleString("ko-KR")} 개인 코인 · 모든 게임 공통</p></div><Button type="button" variant={owned ? "outline" : "default"} disabled={pending || equipped || (!owned && state.coinBalance < item.price_coins)} onClick={() => owned ? void equip("sub", item.id) : setPurchase(item)}>{equipped ? "사용 중" : owned ? "사용하기" : state.coinBalance < item.price_coins ? "코인 부족" : "구매"}</Button></article>;
  })}</div>;
  return <section aria-label={shopOnly ? "칭호 상점" : "공통 네임카드"}>
    <div className={styles.header}><div><h2>{shopOnly ? "칭호 상점" : "내 네임카드"}</h2><p>{shopOnly ? "개인 코인으로 구매하고 모든 게임에서 사용하세요." : "한 번 꾸미면 모든 게임에서 함께 사용합니다."}</p></div>{shopOnly ? <strong className="inline-flex items-center gap-2 text-sm"><Coins size={15} aria-hidden="true" />개인 코인 {state.coinBalance.toLocaleString("ko-KR")}</strong> : <div className={styles.actions}><Button variant="outline" size="sm" onClick={() => { setError(""); setPanel("shop"); }}><ShoppingBag size={14} aria-hidden="true" />칭호 상점</Button><Button size="sm" onClick={() => { setError(""); setPanel("edit"); }}><Sparkles size={14} aria-hidden="true" />네임카드 꾸미기</Button></div>}</div>
    {shopOnly ? shop : <div className={styles.preview}><Namecard displayName="Player#1234" {...appearance} /><p className={styles.note}>미리보기용 ID입니다. 클랜에서는 해당 게임의 배틀태그 또는 라이엇 ID를 표시합니다.</p></div>}
    <Sheet open={panel !== null} onOpenChange={(open) => { if (!pending && !open) setPanel(null); }}><SheetContent showCloseButton={!pending} className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[680px]"><SheetHeader><SheetTitle>{panel === "shop" ? "칭호 상점" : "네임카드 꾸미기"}</SheetTitle><SheetDescription>{panel === "shop" ? `개인 코인 ${state.coinBalance.toLocaleString("ko-KR")} · 구매한 칭호는 영구 보유합니다.` : "선택한 꾸미기는 계정 공통으로 바로 저장됩니다."}</SheetDescription></SheetHeader><div className={styles.fields}>{panel === "shop" ? shop : <><Namecard displayName="Player#1234" {...appearance} />{CATEGORIES.map(([category, label]) => { const available = options(category); return <label key={category}>{label}<select aria-label={`네임카드 ${label}`} value={state.selections.find((item) => item.category === category)?.option_id ?? available[0]?.id ?? ""} disabled={pending || !available.length} onChange={(event) => void equip(category, event.target.value)}>{available.map((item) => <option key={item.id} value={item.id}>{category === "sub" && item.unlock_source === "default" ? "칭호 없음" : item.name_ko}</option>)}</select></label>; })}</>}{error && <p role="alert" className={styles.error}>{error}</p>}<p role="status" className={styles.note}>{status}</p></div></SheetContent></Sheet>
    <Dialog open={!!purchase} onOpenChange={(open) => { if (!pending && !open) setPurchase(null); }}><DialogContent showCloseButton={!pending}><DialogHeader><DialogTitle>칭호를 구매할까요?</DialogTitle><DialogDescription>{purchase?.name_ko} · {purchase?.price_coins.toLocaleString("ko-KR")} 개인 코인<br />보유 {state.coinBalance.toLocaleString("ko-KR")} → 구매 후 {(state.coinBalance - (purchase?.price_coins ?? 0)).toLocaleString("ko-KR")} 코인</DialogDescription></DialogHeader>{error && <p role="alert" className={styles.error}>{error}</p>}<DialogFooter><Button variant="outline" disabled={pending} onClick={() => setPurchase(null)}>취소</Button><Button disabled={pending || state.coinBalance < (purchase?.price_coins ?? 0)} onClick={() => void buy()}>{pending ? "구매 중…" : "구매 확정"}</Button></DialogFooter></DialogContent></Dialog>
    {shopOnly && error && <p role="alert" className={styles.error}>{error}</p>}<p role="status" className={styles.note}>{panel === null ? status : ""}</p>
  </section>;
}
