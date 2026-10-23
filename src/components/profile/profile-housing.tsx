"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Coins, Grip, House, Package, RotateCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { loadHousingAction, purchaseHousingFurnitureAction, saveHousingRoomAction } from "@/app/actions/profile-housing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canPlaceHousingItem, getHousingFootprint, HOUSING_GRID_SIZE } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem, HousingPlacement, HousingResult, HousingState } from "@/lib/housing/types";
import { FurniturePreview } from "./housing-furniture-preview";
import { HousingRoom, type HousingRoomHandle } from "./housing-room";
import styles from "./housing.module.css";

const WALLPAPERS = [{ id: "cream", name: "크림" }, { id: "sage", name: "세이지" }, { id: "rose", name: "로즈" }, { id: "midnight", name: "미드나잇" }];
const FLOORS = [{ id: "oak", name: "밝은 원목" }, { id: "walnut", name: "짙은 원목" }, { id: "ivory", name: "아이보리 타일" }];
const CATEGORY_LABELS: Record<string, string> = { all: "전체", seating: "의자·소파", table: "책상·테이블", storage: "수납·진열", decor: "장식", lighting: "조명" };

function placementsOf(inventory: HousingInventoryItem[]): HousingPlacement[] {
  return inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation }] : []);
}

export function ProfileHousing({ initial, nickname, clanName, gameNames }: {
  initial: HousingResult; nickname: string; clanName?: string; gameNames: string[];
}) {
  const [state, setState] = useState<HousingState | null>(initial.ok ? initial.state : null);
  const [draft, setDraft] = useState(initial.ok ? initial.state.inventory : []);
  const [wallpaper, setWallpaper] = useState(initial.ok ? initial.state.room.wallpaper : "cream");
  const [floor, setFloor] = useState(initial.ok ? initial.state.room.floor : "oak");
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<"inventory" | "shop">("inventory");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [column, setColumn] = useState(0);
  const [row, setRow] = useState(0);
  const [purchase, setPurchase] = useState<HousingCatalogItem | null>(null);
  const purchaseOpener = useRef<HTMLButtonElement | null>(null);
  const room = useRef<HousingRoomHandle>(null);
  const [discard, setDiscard] = useState<"cancel" | "reload" | null>(null);
  const [error, setError] = useState(initial.ok ? "" : initial.error);
  const [pending, startTransition] = useTransition();
  const inventory = editing ? draft : state?.inventory ?? [];
  const selected = inventory.find((item) => item.id === selectedId);
  const selectedCatalog = state?.catalog.find((item) => item.id === selected?.catalogId);
  const placements = placementsOf(draft);
  const dirty = !!state && (wallpaper !== state.room.wallpaper || floor !== state.room.floor || JSON.stringify(draft) !== JSON.stringify(state.inventory));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function apply(next: HousingState) {
    setState(next); setDraft(next.inventory); setWallpaper(next.room.wallpaper); setFloor(next.room.floor); setError("");
  }

  function select(item: HousingInventoryItem) {
    setSelectedId(item.id); setColumn(item.x ?? 0); setRow(item.y ?? 0); setError("");
  }

  function begin(nextPanel: "inventory" | "shop") {
    if (!state) return;
    if (!editing) { setDraft(state.inventory); setWallpaper(state.room.wallpaper); setFloor(state.room.floor); }
    setEditing(true); setPanel(nextPanel); setError("");
  }

  function place(inventoryId: string, x: number, y: number, rotation?: number) {
    const owned = draft.find((item) => item.id === inventoryId);
    if (!state || !owned || !editing || pending) return;
    const turn = rotation ?? owned.rotation;
    if (!canPlaceHousingItem({ inventoryId, x, y, rotation: turn }, placements, draft, state.catalog)) {
      setError("가구가 겹치거나 방 밖으로 나갑니다. 다른 위치를 선택해 주세요."); return;
    }
    setDraft(draft.map((item) => item.id === inventoryId ? { ...item, x, y, rotation: turn } : item));
    setSelectedId(inventoryId); setColumn(x); setRow(y); setError("");
  }

  function move(x: number, y: number, rotation = selected?.rotation ?? 0) {
    if (selected) place(selected.id, x, y, rotation);
  }

  function takeOut(item: HousingInventoryItem) {
    if (!state || pending) return;
    select(item);
    for (let y = 0; y < HOUSING_GRID_SIZE; y++) for (let x = 0; x < HOUSING_GRID_SIZE; x++) {
      if (canPlaceHousingItem({ inventoryId: item.id, x, y, rotation: item.rotation }, placements, draft, state.catalog)) {
        place(item.id, x, y);
        room.current?.scrollIntoView();
        toast.success("빈자리에 꺼냈습니다. 끌어서 위치를 조정해 보세요.");
        return;
      }
    }
    setError("가구를 꺼낼 빈자리가 없습니다. 다른 가구를 보관하거나 위치를 바꿔 주세요.");
  }

  function rotate() {
    if (!selected || selected.x === null || selected.y === null || pending) return;
    const rotation = (selected.rotation + 1) % 4;
    move(selected.x, selected.y, rotation);
  }

  function store() {
    if (!selected || pending) return;
    setDraft(draft.map((item) => item.id === selected.id ? { ...item, x: null, y: null, rotation: state?.inventory.find((entry) => entry.id === item.id)?.rotation ?? 0 } : item)); setError("");
  }

  function reload() {
    startTransition(async () => {
      try { const result = await loadHousingAction(); if (result.ok) { apply(result.state); setSelectedId(null); setDiscard(null); } else setError(result.error); }
      catch { setError("방을 불러오지 못했습니다. 다시 시도해 주세요."); }
    });
  }

  function cancel() {
    if (!state) return;
    apply(state); setEditing(false); setSelectedId(null); setDiscard(null);
  }

  function save() {
    if (!state) return;
    startTransition(async () => {
      try {
        const result = await saveHousingRoomAction({ revision: state.room.revision, wallpaper, floor, placements });
        if (result.ok) { apply(result.state); setEditing(false); setSelectedId(null); toast.success("방을 저장했습니다."); }
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

  return <section className={styles.housing} aria-label="프로필 하우징" aria-busy={pending}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}><House size={14} aria-hidden="true" /> 나의 미니룸</p><h2>{nickname}의 방</h2><p className={styles.subtitle}>함께한 시간으로, 나다운 공간을.</p></div>
      <div className={styles.headerActions}>
        {state && <span className={styles.balance}><Coins size={16} aria-hidden="true" />개인 코인 <strong data-testid="housing-coin-balance">{state.coinBalance.toLocaleString("ko-KR")}</strong></span>}
        {!editing && <div className={styles.buttons}><Button variant="outline" size="sm" onClick={() => begin("shop")} disabled={!state || pending}><ShoppingBag aria-hidden="true" />가구 상점</Button><Button size="sm" onClick={() => begin("inventory")} disabled={!state || pending}>방 꾸미기</Button></div>}
      </div>
    </header>
    {!state ? <div className={styles.loadError}><p role="alert">{error}</p><Button variant="outline" onClick={reload} disabled={pending}>{pending ? "불러오는 중…" : "다시 불러오기"}</Button></div> : <>
      <div className={styles.roomLayout} data-editing={editing}>
        <div className={styles.sceneColumn}>
          <HousingRoom ref={room} inventory={inventory} catalog={state.catalog} selectedId={selectedId} editing={editing} pending={pending}
            wallpaper={editing ? wallpaper : state.room.wallpaper} floor={editing ? floor : state.room.floor} onSelect={select} onMove={move} onDrop={place} />
          <div className={styles.sceneCaption}><span>{placementsOf(inventory).length}개 배치 · {inventory.length - placementsOf(inventory).length}개 보관</span><span>{editing ? "가구를 끌어서 이동 · 바닥을 눌러 배치" : "개인 코인으로 채워가는 나만의 방"}</span></div>
          {editing && <div className={styles.inventoryDock}>
            <div className={styles.editorToolbar}><div className={styles.panelButtons}><Button size="sm" variant={panel === "inventory" ? "secondary" : "ghost"} aria-pressed={panel === "inventory"} onClick={() => setPanel("inventory")}><Package aria-hidden="true" />내 가구</Button><Button size="sm" variant={panel === "shop" ? "secondary" : "ghost"} aria-pressed={panel === "shop"} onClick={() => setPanel("shop")}><ShoppingBag aria-hidden="true" />가구 상점</Button></div><span className={styles.saveStatus} role="status">{dirty ? "저장하지 않은 변경" : "모든 변경이 저장되었습니다"}</span></div>
            {panel === "inventory" && <>
              <p className={styles.inventoryHint}>보관 중 {draft.filter((item) => item.x === null).length}개 · 꺼내기를 누르거나, 끌어놓기를 잡고 방으로 옮기세요.</p>
              <ul className={styles.inventory} aria-label="보유 가구">{draft.map((owned) => {
                const item = state.catalog.find((entry) => entry.id === owned.catalogId);
                if (!item) return null;
                return <li key={owned.id} className={styles.inventoryCard} data-stored={owned.x === null}>
                  <button type="button" className={styles.inventoryItem} aria-label={item.name + " 선택"} aria-pressed={selectedId === owned.id} onClick={() => select(owned)} onPointerDown={(event) => { if (event.pointerType === "mouse") room.current?.startInventoryDrag(event, owned); }} disabled={pending}>
                    <span className={styles.catalogArt}><FurniturePreview code={item.visualKey} rotation={owned.rotation} /></span><strong>{item.name}</strong><span>{owned.x === null ? "보관 중" : "배치됨"}</span>
                  </button>
                  <div className={styles.inventoryActions}>
                    {owned.x === null && <Button size="sm" variant="outline" onClick={() => takeOut(owned)} disabled={pending} aria-label={item.name + " 꺼내기"}>꺼내기</Button>}
                    <button type="button" className={styles.dragHandle} disabled={pending} aria-label={item.name + " 끌어서 배치"} onPointerDown={(event) => room.current?.startInventoryDrag(event, owned)} onClick={(event) => { if (event.detail === 0) { select(owned); room.current?.scrollIntoView(); } }}><Grip size={13} aria-hidden="true" />끌어놓기</button>
                  </div>
                </li>;
              })}</ul>
            </>}
          </div>}
        </div>
        <aside className={styles.sidebar} aria-label={editing ? "선택한 가구 편집" : "방 소개"}>
          {editing ? <>
            <p className={styles.asideLabel}>선택한 가구</p>
            {selected && selectedCatalog ? <>
              <div className={styles.selectedArt}><FurniturePreview code={selectedCatalog.visualKey} rotation={selected.rotation} /></div>
              <h3>{selectedCatalog.name}</h3><p className={styles.description}>{selectedCatalog.description}</p>
              <p className={styles.position}>{selected.x === null ? "보관 중" : `${selected.x + 1}열 ${selected.y! + 1}행`} · {getHousingFootprint(selectedCatalog, selected.rotation).width} × {getHousingFootprint(selectedCatalog, selected.rotation).depth}칸 · {selected.rotation * 90}°</p>
              <fieldset disabled={pending} className={styles.positionControls}><legend>배치 위치</legend><label>열<select aria-label="가구 위치 열" value={column} onChange={(event) => setColumn(Number(event.target.value))}>{Array.from({ length: HOUSING_GRID_SIZE }, (_, i) => <option key={i} value={i}>{i + 1}열</option>)}</select></label><label>행<select aria-label="가구 위치 행" value={row} onChange={(event) => setRow(Number(event.target.value))}>{Array.from({ length: HOUSING_GRID_SIZE }, (_, i) => <option key={i} value={i}>{i + 1}행</option>)}</select></label><Button size="sm" variant="outline" onClick={() => move(column, row)}>선택 위치에 놓기</Button></fieldset>
              <div className={styles.editActions}><Button size="sm" variant="outline" onClick={rotate} disabled={pending || selected.x === null}><RotateCw aria-hidden="true" />가구 회전</Button><Button size="sm" variant="outline" onClick={store} disabled={pending || selected.x === null}><Package aria-hidden="true" />가구 보관</Button></div>
              {selected.x !== null && <div className={styles.nudge} aria-label="가구 한 칸 이동">{[{ label: "가구 위로 이동", dx: 0, dy: -1, Icon: ArrowUp }, { label: "가구 왼쪽 이동", dx: -1, dy: 0, Icon: ArrowLeft }, { label: "가구 아래로 이동", dx: 0, dy: 1, Icon: ArrowDown }, { label: "가구 오른쪽 이동", dx: 1, dy: 0, Icon: ArrowRight }].map(({ label, dx, dy, Icon }) => <Button key={label} size="icon-sm" variant="ghost" aria-label={label} onClick={() => move(selected.x! + dx, selected.y! + dy)} disabled={pending}><Icon aria-hidden="true" /></Button>)}</div>}
            </> : <div className={styles.selectionEmpty}><Package size={28} aria-hidden="true" /><h3>어떤 가구를 놓을까요?</h3><p>방이나 보관함에서 가구를 선택하세요.</p></div>}
            <fieldset className={styles.appearance} disabled={pending}><legend>방 분위기</legend><label>벽지<select aria-label="방 벽지" value={wallpaper} onChange={(event) => setWallpaper(event.target.value)}>{WALLPAPERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>바닥<select aria-label="방 바닥" value={floor} onChange={(event) => setFloor(event.target.value)}>{FLOORS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></fieldset>
          </> : <><span className={styles.miniAvatar} aria-hidden="true">{nickname.slice(0, 1)}</span><h3>{nickname}</h3><p className={styles.clanName}>{clanName || "새로운 인연을 기다리는 중"}</p><div className={styles.introduction}><p className={styles.asideLabel}>플레이하는 게임</p><p>{gameNames.length ? gameNames.join(" · ") : "아래 게임별 탭에서 게임을 연결해 보세요."}</p></div>{selectedCatalog ? <div className={styles.selectedDescription}><p className={styles.asideLabel}>이 방의 가구</p><h3>{selectedCatalog.name}</h3><p>{selectedCatalog.description}</p></div> : <p className={styles.roomNote}>좋아하는 가구를 놓고<br />함께한 시간을 담아보세요.</p>}<Button variant="outline" size="sm" onClick={() => begin("inventory")}>내 가구 {state.inventory.length}개 보기</Button></>}
        </aside>
      </div>
      {editing && panel === "shop" && <div className={styles.editor}>
          <p className={styles.shopNote}>개인 코인으로 구매한 가구는 클랜을 옮겨도 보관됩니다. 가구는 종류별로 하나씩 보유할 수 있어요.</p>
          <div className={styles.categories} aria-label="가구 분류">{Object.entries(CATEGORY_LABELS).map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div>
          {dirty && <p className={styles.purchaseHint}>가구를 구매하기 전에 꾸민 방을 저장해 주세요.</p>}
          <ul className={styles.catalog} aria-label="가구 상품">{state.catalog.filter((item) => category === "all" || item.category === category).map((item) => {
            const owned = state.inventory.some((entry) => entry.catalogId === item.id); const insufficient = state.coinBalance < item.price;
            return <li key={item.id} className={styles.catalogItem}><div className={styles.catalogArt}><FurniturePreview code={item.visualKey} /></div><div className={styles.catalogName}><h3>{item.name}</h3><span>{item.width} × {item.depth}칸</span></div><p>{item.description}</p><div className={styles.price}>{owned ? <><Check size={14} aria-hidden="true" />보유 중</> : <><Coins size={14} aria-hidden="true" />{item.price.toLocaleString("ko-KR")} 코인</>}</div><Button size="sm" variant="outline" className="w-full" disabled={owned || insufficient || dirty || pending} aria-label={`${item.name} 구매`} onClick={(event) => { purchaseOpener.current = event.currentTarget; setPurchase(item); setError(""); }}>{owned ? "보유 중" : insufficient ? "코인 부족" : "구매"}</Button></li>;
          })}</ul>
      </div>}
      {error && <div className={styles.error}><p role="alert">{error}</p><Button size="sm" variant="ghost" disabled={pending} onClick={() => dirty ? setDiscard("reload") : reload()}>최신 방 불러오기</Button></div>}
      {editing && <footer className={styles.editorFooter}><span>배치·회전·보관에는 코인이 들지 않아요.</span><div className={styles.buttons}><Button variant="outline" onClick={() => dirty ? setDiscard("cancel") : cancel()} disabled={pending}>편집 취소</Button><Button onClick={save} disabled={pending || !dirty}>{pending ? "처리 중…" : "방 저장"}</Button></div></footer>}
    </>}
    <Dialog open={!!purchase} onOpenChange={(open) => { if (!open && !pending) setPurchase(null); }}><DialogContent showCloseButton={!pending} finalFocus={purchaseOpener}><DialogHeader><DialogTitle>가구 구매</DialogTitle><DialogDescription>{purchase?.name}을 개인 코인으로 구매합니다. 구매 후 보관함에서 방에 배치할 수 있어요.</DialogDescription></DialogHeader>{purchase && <><div className={styles.purchaseArt}><FurniturePreview code={purchase.visualKey} /></div><p className={styles.purchaseTerms}>사용 코인 {purchase.price.toLocaleString("ko-KR")} · 구매 후 잔액 {((state?.coinBalance ?? 0) - purchase.price).toLocaleString("ko-KR")} 코인</p><p className={styles.purchaseTerms}>구매한 가구는 영구 보유하며 환불은 지원되지 않습니다.</p></>}<DialogFooter><Button variant="outline" disabled={pending} onClick={() => setPurchase(null)}>취소</Button><Button disabled={pending} onClick={buy}>{pending ? "구매 중…" : `${purchase?.price.toLocaleString("ko-KR")} 코인으로 구매`}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!discard} onOpenChange={(open) => { if (!open && !pending) setDiscard(null); }}><DialogContent><DialogHeader><DialogTitle>변경 내용을 버릴까요?</DialogTitle><DialogDescription>저장하지 않은 배치와 방 분위기 변경을 취소합니다. 구매한 가구는 보관함에 유지됩니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDiscard(null)} disabled={pending}>계속 꾸미기</Button><Button onClick={() => discard === "reload" ? reload() : cancel()} disabled={pending}>변경 내용 버리기</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
