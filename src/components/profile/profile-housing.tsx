"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode, type RefObject } from "react";
import { Check, Coins, Grip, Package, Paintbrush, ShoppingBag, X, Undo2, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { loadHousingAction, purchaseHousingFurnitureAction, saveHousingRoomAction } from "@/app/actions/profile-housing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canPlaceHousingItem, HOUSING_GRID_SIZE } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem, HousingPlacement, HousingResult, HousingState, HousingSurface } from "@/lib/housing/types";
import { FurniturePreview } from "./housing-furniture-preview";
import { HousingRoom, type HousingRoomHandle } from "./housing-room";
import styles from "./housing.module.css";

const WALLPAPERS = [{ id: "cream", name: "크림" }, { id: "sage", name: "세이지" }, { id: "rose", name: "로즈" }, { id: "midnight", name: "미드나잇" }];
const FLOORS = [{ id: "oak", name: "밝은 원목" }, { id: "walnut", name: "짙은 원목" }, { id: "ivory", name: "아이보리 타일" }];
const CATEGORY_LABELS: Record<string, string> = { all: "전체", seating: "의자·소파", table: "책상·테이블", storage: "수납·진열", decor: "장식", lighting: "조명" };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function placementsOf(inventory: HousingInventoryItem[]): HousingPlacement[] {
  return inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation, surface: item.surface ?? "floor" }] : []);
}

export function ProfileHousing({ initial, nickname, embedded = false }: {
  initial: HousingResult; nickname: string; clanName?: string; gameNames: string[]; embedded?: boolean;
}) {
  const [state, setState] = useState<HousingState | null>(initial.ok ? initial.state : null);
  const [draft, setDraft] = useState(initial.ok ? initial.state.inventory : []);
  const [wallpaper, setWallpaper] = useState(initial.ok ? initial.state.room.wallpaper : "cream");
  const [floor, setFloor] = useState(initial.ok ? initial.state.room.floor : "oak");
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<"inventory" | "shop" | "appearance" | null>(null);
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [purchase, setPurchase] = useState<HousingCatalogItem | null>(null);
  const purchaseOpener = useRef<HTMLButtonElement | null>(null);
  const room = useRef<HousingRoomHandle>(null);
  const inventoryOpener = useRef<HTMLButtonElement>(null);
  const dialogContainer = useRef<HTMLDivElement>(null);
  const [discard, setDiscard] = useState<"cancel" | "reload" | null>(null);
  const [error, setError] = useState(initial.ok ? "" : initial.error);
  const [pending, startTransition] = useTransition();
  const inventory = editing ? draft : state?.inventory ?? [];
  const selected = inventory.find((item) => item.id === selectedId);
  const placements = placementsOf(draft);
  const dirty = !!state && (wallpaper !== state.room.wallpaper || floor !== state.room.floor || JSON.stringify(draft) !== JSON.stringify(state.inventory));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function apply(next: HousingState) {
    room.current?.dismissMenu();
    setState(next); setDraft(next.inventory); setWallpaper(next.room.wallpaper); setFloor(next.room.floor); setError("");
  }

  function select(item: HousingInventoryItem) {
    room.current?.dismissMenu();
    setSelectedId(item.id); setError("");
  }

  function begin(nextPanel: "inventory" | "shop" | "appearance" | null) {
    if (!state) return;
    room.current?.dismissMenu();
    if (!editing) { setDraft(state.inventory); setWallpaper(state.room.wallpaper); setFloor(state.room.floor); }
    setEditing(true); setPanel(nextPanel); setError("");
  }

  function place(inventoryId: string, x: number, y: number, surface: HousingSurface = "floor", rotation?: number) {
    const owned = draft.find((item) => item.id === inventoryId);
    if (!state || !owned || !editing || pending) return;
    const turn = rotation ?? owned.rotation;
    if (!canPlaceHousingItem({ inventoryId, x, y, rotation: turn, surface }, placements, draft, state.catalog)) {
      setError("가구가 겹치거나 방 밖으로 나갑니다. 다른 위치를 선택해 주세요."); return;
    }
    setDraft(draft.map((item) => item.id === inventoryId ? { ...item, x, y, rotation: turn, surface } : item));
    setSelectedId(inventoryId); setError("");
  }

  function move(x: number, y: number, surface: HousingSurface = selected?.surface ?? "floor") {
    if (selected) place(selected.id, x, y, surface);
  }

  function takeOut(item: HousingInventoryItem) {
    if (!state || pending) return;
    const info = state.catalog.find((entry) => entry.id === item.catalogId);
    const surfaces: HousingSurface[] = info?.mount === "wall" ? ["wall-left", "wall-right"] : ["floor"];
    for (const surface of surfaces) for (let y = 0; y < (surface === "floor" ? 6 : 4); y++) for (let x = 0; x < HOUSING_GRID_SIZE; x++) {
      if (canPlaceHousingItem({ inventoryId: item.id, x, y, rotation: item.rotation, surface }, placements, draft, state.catalog)) {
        place(item.id, x, y, surface); setPanel(null); return;
      }
    }
    setError("가구를 꺼낼 빈자리가 없습니다. 다른 가구를 보관하거나 위치를 바꿔 주세요.");
  }

  function rotate(inventoryId: string) {
    const item = draft.find((entry) => entry.id === inventoryId);
    if (!item || item.x === null || item.y === null || pending || item.surface !== "floor") return;
    place(item.id, item.x, item.y, "floor", (item.rotation + 1) % 4);
  }

  function store(inventoryId: string) {
    if (pending || !editing) return;
    setDraft(draft.map((item) => item.id === inventoryId ? { ...item, x: null, y: null } : item));
    setSelectedId(null); setError("");
    inventoryOpener.current?.focus({ preventScroll: true });
  }

  function reload() {
    startTransition(async () => {
      try { const result = await loadHousingAction(); if (result.ok) { apply(result.state); setSelectedId(null); setDiscard(null); } else setError(result.error); }
      catch { setError("방을 불러오지 못했습니다. 다시 시도해 주세요."); }
    });
  }

  function cancel() {
    if (!state) return;
    apply(state); setEditing(false); setPanel(null); setSelectedId(null); setDiscard(null);
  }

  function save() {
    if (!state) return;
    startTransition(async () => {
      try {
        const result = await saveHousingRoomAction({ revision: state.room.revision, wallpaper, floor, placements });
        if (result.ok) { apply(result.state); setEditing(false); setPanel(null); setSelectedId(null); toast.success("방을 저장했습니다."); }
        else setError(result.error);
      } catch { setError("방을 저장하지 못했습니다. 변경 내용은 유지됩니다. 다시 시도해 주세요."); }
    });
  }

  function buy() {
    if (!purchase || dirty) return;
    const item = purchase;
    startTransition(async () => {
      try {
        const result = await purchaseHousingFurnitureAction({ catalogId: item.id });
        if (result.ok) {
          apply(result.state); setPurchase(null); setPanel("inventory"); setEditing(true);
          const owned = result.state.inventory.find((entry) => entry.catalogId === item.id);
          if (owned) select(owned);
          toast.success(`${item.name}을 보관함에 추가했습니다.`);
        } else { setError(result.error); setPurchase(null); }
      } catch { setError("구매 결과를 확인하지 못했습니다. 다시 시도해도 중복 차감되지 않습니다."); setPurchase(null); }
    });
  }

  return <section className={styles.housing} data-embedded={embedded} aria-label="프로필 하우징" aria-busy={pending}>
    {!state ? <div className={styles.loadError}><p role="alert">{error}</p><Button variant="outline" onClick={reload} disabled={pending}>{pending ? "불러오는 중…" : "다시 불러오기"}</Button></div> : <HousingRoom ref={room} inventory={inventory} catalog={state.catalog} selectedId={selectedId} editing={editing} pending={pending}
      theme={mounted && resolvedTheme === "light" ? "light" : "dark"} wallpaper={editing ? wallpaper : state.room.wallpaper} floor={editing ? floor : state.room.floor}
      onBeginMove={(item) => { begin(null); setSelectedId(item.id); }} onSelect={select} onMove={move} onDrop={place} onRotate={rotate} onStore={store}>
      <div className={styles.roomHud} data-room-ui="true">
        <header className={styles.roomHeading}><h2>{nickname}의 방</h2><span className={styles.balance}><Coins size={14} aria-hidden="true" /><span className={styles.srOnly}>개인 코인</span><strong data-testid="housing-coin-balance">{state.coinBalance.toLocaleString("ko-KR")}</strong></span></header>
        <div className={styles.roomToolbar} role="toolbar" aria-label="방 꾸미기 도구">
          {editing ? <><Button ref={inventoryOpener} size="sm" variant={panel === "inventory" ? "secondary" : "ghost"} aria-pressed={panel === "inventory"} onClick={() => setPanel(panel === "inventory" ? null : "inventory")}><Package aria-hidden="true" /><span>내 가구</span></Button><Button size="sm" variant={panel === "shop" ? "secondary" : "ghost"} aria-pressed={panel === "shop"} onClick={() => setPanel(panel === "shop" ? null : "shop")}><ShoppingBag aria-hidden="true" /><span>가구 상점</span></Button><Button size="icon-sm" variant={panel === "appearance" ? "secondary" : "ghost"} aria-label="방 분위기" aria-pressed={panel === "appearance"} onClick={() => setPanel(panel === "appearance" ? null : "appearance")}><Paintbrush aria-hidden="true" /></Button><span className={styles.toolbarDivider} /><Button size="icon-sm" variant="ghost" aria-label="편집 취소" onClick={() => dirty ? setDiscard("cancel") : cancel()} disabled={pending}><Undo2 aria-hidden="true" /></Button><Button size="sm" onClick={save} disabled={pending || !dirty}><Save aria-hidden="true" />{pending ? "저장 중" : "방 저장"}</Button></> : <><Button size="sm" variant="ghost" onClick={() => begin("shop")} disabled={pending}><ShoppingBag aria-hidden="true" />가구 상점</Button><Button size="sm" onClick={() => begin(null)} disabled={pending}>방 꾸미기</Button></>}
        </div>
        <span className={styles.srOnly} role="status">{dirty ? "저장하지 않은 변경" : "모든 변경이 저장되었습니다"}</span>
        {editing && panel && <section className={styles.roomPanel} aria-label={panel === "inventory" ? "내 가구 보관함" : panel === "shop" ? "가구 상점" : "방 분위기"} data-panel={panel}>
          <div className={styles.panelHeader}><h3>{panel === "inventory" ? "내 가구" : panel === "shop" ? "가구 상점" : "방 분위기"}</h3><Button size="icon-sm" variant="ghost" aria-label="패널 닫기" onClick={() => setPanel(null)}><X aria-hidden="true" /></Button></div>
          {panel === "inventory" && <ul className={styles.inventory} aria-label="보유 가구">{draft.map((owned) => {
            const item = state.catalog.find((entry) => entry.id === owned.catalogId);
            if (!item) return null;
            return <li key={owned.id} className={styles.inventoryCard} data-stored={owned.x === null}>
              <button type="button" className={styles.inventoryItem} aria-label={item.name + " 선택"} aria-pressed={selectedId === owned.id} onClick={() => select(owned)} onPointerDown={(event) => { if (event.pointerType === "mouse") room.current?.startInventoryDrag(event, owned); }} disabled={pending}>
                <span className={styles.catalogArt}><FurniturePreview code={item.visualKey} rotation={owned.rotation} /></span><strong>{item.name}</strong><span>{owned.x === null ? "보관 중" : "배치됨"}</span>
              </button>
              <div className={styles.inventoryActions}>{owned.x === null && <Button size="sm" variant="outline" onClick={() => takeOut(owned)} disabled={pending} aria-label={item.name + " 꺼내기"}>꺼내기</Button>}<button type="button" className={styles.dragHandle} disabled={pending} aria-label={item.name + " 끌어서 배치"} onPointerDown={(event) => room.current?.startInventoryDrag(event, owned)} onClick={(event) => { if (event.detail === 0) { select(owned); setPanel(null); } }}><Grip size={12} aria-hidden="true" />끌어놓기</button></div>
            </li>;
          })}</ul>}
          {panel === "shop" && <><div className={styles.categories} aria-label="가구 분류">{Object.entries(CATEGORY_LABELS).map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div>
            {dirty && <p className={styles.purchaseHint}>구매 전에 방을 저장해 주세요.</p>}
            <ul className={styles.catalog} aria-label="가구 상품">{state.catalog.filter((item) => category === "all" || item.category === category).map((item) => {
              const owned = state.inventory.some((entry) => entry.catalogId === item.id); const insufficient = state.coinBalance < item.price;
              return <li key={item.id} className={styles.catalogItem}><div className={styles.catalogArt}><FurniturePreview code={item.visualKey} /></div><div className={styles.catalogName}><h3>{item.name}</h3></div><div className={styles.price}>{owned ? <><Check size={12} aria-hidden="true" />보유 중</> : <><Coins size={12} aria-hidden="true" />{item.price.toLocaleString("ko-KR")}</>}</div><Button size="sm" variant="outline" disabled={owned || insufficient || dirty || pending} aria-label={item.name + " 구매"} onClick={(event) => { purchaseOpener.current = event.currentTarget; setPurchase(item); setError(""); }}>{owned ? "보유 중" : insufficient ? "코인 부족" : "구매"}</Button></li>;
            })}</ul></>}
          {panel === "appearance" && <fieldset className={styles.appearance} disabled={pending}><legend className={styles.srOnly}>방 분위기</legend><label>벽지<select aria-label="방 벽지" value={wallpaper} onChange={(event) => setWallpaper(event.target.value)}>{WALLPAPERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>바닥<select aria-label="방 바닥" value={floor} onChange={(event) => setFloor(event.target.value)}>{FLOORS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></fieldset>}
        </section>}
        {error && <div className={styles.roomError}><p role="alert">{error}</p><Button size="sm" variant="ghost" disabled={pending} onClick={() => dirty ? setDiscard("reload") : reload()}>최신 방 불러오기</Button><Button size="icon-sm" variant="ghost" aria-label="오류 닫기" onClick={() => setError("")}><X aria-hidden="true" /></Button></div>}
      </div>
      <div ref={dialogContainer} className={styles.dialogLayer} data-room-ui="true" />
    </HousingRoom>}
    <Dialog open={!!purchase} onOpenChange={(open) => { if (!open && !pending) setPurchase(null); }}><HousingDialogContent container={dialogContainer} showCloseButton={!pending} finalFocus={purchaseOpener}><DialogHeader><DialogTitle>가구 구매</DialogTitle><DialogDescription>{purchase?.name}을 개인 코인으로 구매합니다. 구매 후 보관함에서 방에 배치할 수 있어요.</DialogDescription></DialogHeader>{purchase && <><div className={styles.purchaseArt}><FurniturePreview code={purchase.visualKey} /></div><p className={styles.purchaseTerms}>사용 코인 {purchase.price.toLocaleString("ko-KR")} · 구매 후 잔액 {((state?.coinBalance ?? 0) - purchase.price).toLocaleString("ko-KR")} 코인</p><p className={styles.purchaseTerms}>구매한 가구는 영구 보유하며 환불은 지원되지 않습니다.</p></>}<DialogFooter><Button variant="outline" disabled={pending} onClick={() => setPurchase(null)}>취소</Button><Button disabled={pending} onClick={buy}>{pending ? "구매 중…" : `${purchase?.price.toLocaleString("ko-KR")} 코인으로 구매`}</Button></DialogFooter></HousingDialogContent></Dialog>
    <Dialog open={!!discard} onOpenChange={(open) => { if (!open && !pending) setDiscard(null); }}><HousingDialogContent container={dialogContainer}><DialogHeader><DialogTitle>변경 내용을 버릴까요?</DialogTitle><DialogDescription>저장하지 않은 배치와 방 분위기 변경을 취소합니다. 구매한 가구는 보관함에 유지됩니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDiscard(null)} disabled={pending}>계속 꾸미기</Button><Button onClick={() => discard === "reload" ? reload() : cancel()} disabled={pending}>변경 내용 버리기</Button></DialogFooter></HousingDialogContent></Dialog>
  </section>;
}

function HousingDialogContent({ children, container, finalFocus, showCloseButton = true }: { children: ReactNode; container: RefObject<HTMLDivElement | null>; finalFocus?: RefObject<HTMLButtonElement | null>; showCloseButton?: boolean }) {
  return <DialogPrimitive.Portal container={container}><DialogPrimitive.Backdrop className={styles.dialogBackdrop} data-room-ui="true" /><DialogPrimitive.Popup className={styles.dialogContent} finalFocus={finalFocus} data-room-ui="true">{children}{showCloseButton && <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className={styles.dialogClose} aria-label="닫기" />}><X aria-hidden="true" /></DialogPrimitive.Close>}</DialogPrimitive.Popup></DialogPrimitive.Portal>;
}
