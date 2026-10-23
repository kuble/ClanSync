"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button-variants";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode, type RefObject } from "react";
import { Coins, Grip, Package, ShoppingBag, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { loadHousingAction, saveHousingRoomAction } from "@/app/actions/profile-housing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HousingAutosave, housingInput } from "@/lib/housing/autosave";
import { canPlaceHousingItem } from "@/lib/housing/domain";
import type { HousingInventoryItem, HousingPlacement, HousingResult, HousingState, HousingSurface } from "@/lib/housing/types";
import { FurniturePreview } from "./housing-furniture-preview";
import { HousingRoom, type HousingRoomHandle } from "./housing-room";
import styles from "./housing.module.css";

const WALLPAPERS = [{ id: "cream", name: "크림" }, { id: "sage", name: "세이지" }, { id: "rose", name: "로즈" }, { id: "midnight", name: "미드나잇" }];
const FLOORS = [{ id: "oak", name: "밝은 원목" }, { id: "walnut", name: "짙은 원목" }, { id: "ivory", name: "아이보리 타일" }];
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function placementsOf(inventory: HousingInventoryItem[]): HousingPlacement[] {
  return inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation, surface: item.surface ?? "floor" }] : []);
}

export function ProfileHousing({ initial, userId, embedded = false }: {
  initial: HousingResult; userId: string; embedded?: boolean;
}) {
  const [state, setState] = useState<HousingState | null>(initial.ok ? initial.state : null);
  const [incomingCoins, setIncomingCoins] = useState(initial.ok ? initial.state.coinBalance : null);
  if (initial.ok && incomingCoins !== initial.state.coinBalance) {
    setIncomingCoins(initial.state.coinBalance);
    setState((previous) => previous && ({ ...previous, coinBalance: initial.state.coinBalance }));
  }
  const [autosave] = useState(() => new HousingAutosave(initial.ok ? housingInput(initial.state) : { revision: 0, wallpaper: "cream", floor: "oak", placements: [] }, async (input) => {
    const result = await saveHousingRoomAction(input, userId);
    if (result.ok) setState(result.state);
    return result;
  }));
  const saved = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot, autosave.getSnapshot);
  const { wallpaper, floor, placements } = saved.input;
  const [category, setCategory] = useState<"furniture" | "wallpaper" | "floor">("furniture");
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<"inventory" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const room = useRef<HousingRoomHandle>(null);
  const inventoryOpener = useRef<HTMLButtonElement>(null);
  const dialogContainer = useRef<HTMLDivElement>(null);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState(initial.ok ? "" : initial.error);
  const [loading, startTransition] = useTransition();
  const pending = loading;
  const inventory = (state?.inventory ?? []).map(item => { const placed = placements.find(p => p.inventoryId === item.id); return placed ? { ...item, ...placed } : { ...item, x: null, y: null }; });
  const draft = inventory;
  const selected = inventory.find((item) => item.id === selectedId);
  const dirty = saved.dirty || saved.saving;
  const displayError = error || saved.error;
  function setDraft(next: HousingInventoryItem[]) { autosave.edit({ wallpaper, floor, placements: placementsOf(next) }); }
  useEffect(() => () => { void autosave.flush(); }, [autosave]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function apply(next: HousingState) {
    room.current?.dismissMenu();
    setState(next); autosave.reset(housingInput(next)); setError("");
  }

  function select(item: HousingInventoryItem) {
    room.current?.dismissMenu();
    setEditing(true); setPanel("inventory"); setCategory("furniture"); setSelectedId(item.id); setError("");
  }

  function endMove() {
    room.current?.dismissMenu();
    setEditing(false); setSelectedId(null); setPanel(null);
  }

  function place(inventoryId: string, x: number, y: number, surface: HousingSurface = "floor", rotation?: number) {
    const owned = draft.find((item) => item.id === inventoryId);
    if (!state || !owned || !editing || pending) return;
    const turn = rotation ?? owned.rotation;
    if (!canPlaceHousingItem({ inventoryId, x, y, rotation: turn, surface }, placements, draft, state.catalog)) {
      setError("가구가 겹치거나 방 밖으로 나갑니다. 다른 위치를 선택해 주세요."); return;
    }
    setDraft(draft.map((item) => item.id === inventoryId ? { ...item, x, y, rotation: turn, surface } : item));
    if (rotation === undefined) endMove();
    setError("");
  }

  function move(x: number, y: number, surface: HousingSurface = selected?.surface ?? "floor") {
    if (selected) place(selected.id, x, y, surface);
  }

  function takeOut(item: HousingInventoryItem) {
    if (!state || pending) return;
    room.current?.pickInventory(item);
  }

  function rotate(inventoryId: string) {
    const item = draft.find((entry) => entry.id === inventoryId);
    if (!item || item.x === null || item.y === null || pending || item.surface !== "floor") return;
    place(item.id, item.x, item.y, "floor", (item.rotation + 1) % 4);
  }

  function store(inventoryId: string) {
    if (pending || !editing) return;
    setDraft(draft.map((item) => item.id === inventoryId ? { ...item, x: null, y: null } : item));
    endMove(); setError("");
    inventoryOpener.current?.focus({ preventScroll: true });
  }

  function reload() {
    startTransition(async () => {
      try { const result = await loadHousingAction(); if (result.ok) { apply(result.state); setSelectedId(null); setDiscard(false); } else setError(result.error); }
      catch { setError("방을 불러오지 못했습니다. 다시 시도해 주세요."); }
    });
  }

  return <section className={styles.housing} data-embedded={embedded} aria-label="프로필 하우징" aria-busy={pending}>
    {!state ? <div className={styles.loadError}><p role="alert">{error}</p><Button variant="outline" onClick={reload} disabled={pending}>{pending ? "불러오는 중…" : "다시 불러오기"}</Button></div> : <HousingRoom ref={room} inventory={inventory} catalog={state.catalog} selectedId={selectedId} editing={editing} pending={pending}
      theme={mounted && resolvedTheme === "light" ? "light" : "dark"} wallpaper={wallpaper} floor={floor}
      onBeginMove={select} onCancelMove={endMove} onSelect={select} onMove={move} onDrop={place} onRotate={rotate} onStore={store}>
      <div className={styles.roomHud} data-room-ui="true" data-editing={editing}>
        <header className={styles.roomHeading}><h2>나의 방</h2><span className={styles.balance}><Coins size={14} aria-hidden="true" /><span className={styles.srOnly}>개인 코인</span><strong data-testid="housing-coin-balance">{state.coinBalance.toLocaleString("ko-KR")}</strong></span></header>
        <div className={styles.roomToolbar} role="toolbar" aria-label="방 꾸미기 도구" data-editing={editing}>
          <Button ref={inventoryOpener} size="sm" variant={panel === "inventory" ? "secondary" : "ghost"} aria-expanded={panel === "inventory"} onClick={() => { if (panel) { room.current?.cancelMove(); endMove(); } else setPanel("inventory"); }} disabled={pending}><Package aria-hidden="true" /><span>내 가구</span></Button>
            <Tooltip><TooltipTrigger render={<Link href="/store" aria-label="개인 상점" className={buttonVariants({ variant: "ghost", size: "icon" })} />}><ShoppingBag aria-hidden="true" /><span className={styles.roomActionLabel}>개인 상점</span></TooltipTrigger><TooltipContent role="tooltip">개인 상점</TooltipContent></Tooltip>
        </div>
        {panel && <section className={styles.roomPanel} aria-label="내 가구 보관함" data-panel={panel}>
          <div className={styles.drawerGrip} aria-hidden="true" />
          <div className={styles.panelHeader}><h3>내 가구</h3><Button size="icon-sm" variant="ghost" aria-label="패널 닫기" onClick={() => { room.current?.cancelMove(); endMove(); inventoryOpener.current?.focus({ preventScroll: true }); }}><X aria-hidden="true" /></Button></div>
          {editing && <button type="button" className={styles.storeTarget} data-housing-store="true" onClick={() => { if (selectedId) { room.current?.cancelMove(false); store(selectedId); } }}><Package size={20} aria-hidden="true" /><span>여기에 놓아 보관</span></button>}
          <div className={styles.categories} role="group" aria-label="내 가구 분류">{([["furniture", "가구"], ["wallpaper", "벽지"], ["floor", "바닥"]] as const).map(([id, name]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{name}</button>)}</div>
          {category === "furniture" && <ul className={styles.inventory} aria-label="보유 가구">{draft.map((owned) => {
            const item = state.catalog.find((entry) => entry.id === owned.catalogId);
            if (!item) return null;
            return <li key={owned.id} className={styles.inventoryCard} data-stored={owned.x === null}>
              <button type="button" className={styles.inventoryItem} aria-label={item.name + " 선택"} aria-pressed={selectedId === owned.id} onClick={() => takeOut(owned)} onPointerDown={(event) => { if (event.pointerType === "mouse") room.current?.startInventoryDrag(event, owned); }} disabled={pending}>
                <span className={styles.catalogArt}><FurniturePreview code={item.visualKey} rotation={owned.rotation} /></span><strong>{item.name}</strong><span>{owned.x === null ? "보관 중" : "배치됨"}</span>
              </button>
              <div className={styles.inventoryActions}>{owned.x === null && <Button size="sm" variant="outline" onClick={() => takeOut(owned)} disabled={pending} aria-label={item.name + " 꺼내기"}>꺼내기</Button>}<button type="button" className={styles.dragHandle} disabled={pending} aria-label={item.name + " 끌어서 배치"} onPointerDown={(event) => room.current?.startInventoryDrag(event, owned)} onClick={(event) => { if (event.detail === 0) takeOut(owned); }}><Grip size={12} aria-hidden="true" />끌어놓기</button></div>
            </li>;
          })}</ul>}
          {category !== "furniture" && <ul className={styles.inventory} aria-label={category === "wallpaper" ? "벽지 목록" : "바닥 목록"}>{(category === "wallpaper" ? WALLPAPERS : FLOORS).map(item => {
            const active = (category === "wallpaper" ? wallpaper : floor) === item.id;
            return <li key={item.id} className={styles.inventoryCard}><button type="button" className={styles.materialItem} aria-label={item.name + (category === "wallpaper" ? " 벽지 적용" : " 바닥 적용")} aria-pressed={active} disabled={pending} onClick={() => autosave.edit({ wallpaper, floor, placements, [category]: item.id })}>
              <span className={styles.materialArt} aria-hidden="true"><span className={styles.materialSample} data-material={category} data-code={item.id} /></span><strong>{item.name}</strong><span>{active ? "사용 중" : "적용"}</span>
            </button></li>;
          })}</ul>}
        </section>}
        {displayError && <div className={styles.roomError}><p role="alert">{displayError}</p>{saved.error && <Button size="sm" variant="outline" disabled={pending || saved.saving} onClick={() => void autosave.retry()}>자동 저장 다시 시도</Button>}<Button size="sm" variant="ghost" disabled={pending || saved.saving} onClick={() => dirty ? setDiscard(true) : reload()}>최신 방 불러오기</Button>{!saved.error && <Button size="icon-sm" variant="ghost" aria-label="오류 닫기" onClick={() => setError("")}><X aria-hidden="true" /></Button>}</div>}
      </div>
      <div ref={dialogContainer} className={styles.dialogLayer} data-room-ui="true" />
    </HousingRoom>}
    <Dialog open={!!discard} onOpenChange={(open) => { if (!open && !pending) setDiscard(false); }}><HousingDialogContent container={dialogContainer}><DialogHeader><DialogTitle>변경 내용을 버릴까요?</DialogTitle><DialogDescription>자동 저장되지 않은 배치·벽지·바닥 변경을 버리고 최신 방을 불러옵니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDiscard(false)} disabled={pending}>계속 꾸미기</Button><Button onClick={() => reload()} disabled={pending}>변경 내용 버리기</Button></DialogFooter></HousingDialogContent></Dialog>
  </section>;
}

function HousingDialogContent({ children, container, finalFocus, showCloseButton = true }: { children: ReactNode; container: RefObject<HTMLDivElement | null>; finalFocus?: RefObject<HTMLButtonElement | null>; showCloseButton?: boolean }) {
  return <DialogPrimitive.Portal container={container}><DialogPrimitive.Backdrop className={styles.dialogBackdrop} data-room-ui="true" /><DialogPrimitive.Popup className={styles.dialogContent} finalFocus={finalFocus} data-room-ui="true">{children}{showCloseButton && <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" className={styles.dialogClose} aria-label="닫기" />}><X aria-hidden="true" /></DialogPrimitive.Close>}</DialogPrimitive.Popup></DialogPrimitive.Portal>;
}
