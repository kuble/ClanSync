"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref, type ReactNode } from "react";
import { canPlaceHousingItem, getHousingFootprint } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem, HousingSurface } from "@/lib/housing/types";
import { MoreHorizontal, Package, RotateCw } from "lucide-react";
import type { HousingDragPreview, RoomProjection, RoomView, createHousingScene } from "./housing-three-scene";
import { FurnitureArt } from "./housing-furniture-art";
import styles from "./housing.module.css";

export type HousingRoomHandle = {
  startInventoryDrag: (event: ReactPointerEvent<HTMLElement>, item: HousingInventoryItem) => void;
  scrollIntoView: () => void;
  dismissMenu: () => void;
};
type Props = RoomView & {
  ref?: Ref<HousingRoomHandle>;
  pending: boolean;
  onBeginMove: (item: HousingInventoryItem) => void;
  onSelect: (item: HousingInventoryItem) => void;
  onMove: (x: number, y: number, surface?: HousingSurface) => void;
  onDrop: (inventoryId: string, x: number, y: number, surface: HousingSurface) => void;
  onRotate: (inventoryId: string) => void;
  onStore: (inventoryId: string) => void;
  children?: ReactNode;
};
type Drag = {
  pointerId: number; item: HousingInventoryItem; startX: number; startY: number;
  offsetX: number; offsetY: number; moved: boolean; candidate: HousingDragPreview | null;
  fromInventory: boolean; clientX: number; clientY: number;
};
type PointerStart = Pick<ReactPointerEvent<HTMLElement>, "pointerId" | "isPrimary" | "button" | "clientX" | "clientY">;
type Hold = { pointer: PointerStart; timer: ReturnType<typeof setTimeout>; item: HousingInventoryItem };

export function HousingRoom(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createHousingScene> | null>(null);
  const rendererReady = useRef(false);
  const drag = useRef<Drag | null>(null);
  const hold = useRef<Hold | null>(null);
  const suppressClick = useRef(false);
  const [dragPreview, setDragPreview] = useState<{ item: HousingInventoryItem; candidate: HousingDragPreview | null } | null>(null);
  const [dragMessage, setDragMessage] = useState("");
  const [menu, setMenu] = useState<{ inventoryId: string; left: number; top: number } | null>(null);
  const [projection, setProjection] = useState<RoomProjection | null>(null);
  const [fallback, setFallback] = useState(false);
  const { inventory, catalog, selectedId, editing, pending, wallpaper, floor, theme, onBeginMove, onSelect, onMove, onDrop, onRotate, onStore } = props;
  const current = useRef(props);

  const cancelHold = useCallback(() => {
    const active = hold.current;
    if (!active) return;
    hold.current = null;
    clearTimeout(active.timer);
    if (surface.current?.hasPointerCapture(active.pointer.pointerId)) surface.current.releasePointerCapture(active.pointer.pointerId);
  }, []);

  function groundPoint(clientX: number, clientY: number, mount: "floor" | "wall" = "floor") {
    if (rendererReady.current && engine.current) return engine.current.placementPoint(clientX, clientY, mount);
    const rect = surface.current?.getBoundingClientRect();
    if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    if (mount === "wall") {
      const left = (clientX - rect.left) / rect.width * 100, top = (clientY - rect.top) / rect.height * 100;
      const surface: HousingSurface = left < 50 ? "wall-left" : "wall-right";
      const x = surface === "wall-left" ? (left - 8) / 7 : (left - 50) / 7;
      const y = ((surface === "wall-left" ? 62 - x * (22 / 6) : 40 + x * (22 / 6)) - top) / (37 / 4);
      return { x, y, surface };
    }
    const u = ((clientX - rect.left) / rect.width * 100 - 50) / 7;
    const v = ((clientY - rect.top) / rect.height * 100 - 40) / (22 / 6);
    return { x: (u + v) / 2, y: (v - u) / 2, surface: "floor" as const };
  }

  function startDrag(event: PointerStart, item: HousingInventoryItem, fromInventory: boolean, fromHold = false) {
    const latest = current.current;
    if ((!latest.editing && !fromHold) || latest.pending || drag.current || !event.isPrimary || event.button !== 0 || !surface.current) return;
    const info = latest.catalog.find((entry) => entry.id === item.catalogId);
    if (!info) return;
    const size = getHousingFootprint(info, item.rotation);
    const point = groundPoint(event.clientX, event.clientY, info.mount);
    setMenu(null);
    suppressClick.current = fromHold;
    drag.current = {
      pointerId: event.pointerId, item, startX: event.clientX, startY: event.clientY,
      offsetX: !fromInventory && point && item.x !== null ? point.x - item.x : size.width / 2,
      offsetY: !fromInventory && point && item.y !== null ? point.y - item.y : size.depth / 2,
      moved: false, candidate: null, fromInventory, clientX: event.clientX, clientY: event.clientY,
    };
    surface.current.setPointerCapture(event.pointerId);
    latest.onSelect(item);
    setDragMessage("");
  }

  function startHold(event: ReactPointerEvent<HTMLElement>, item: HousingInventoryItem) {
    const pointer: PointerStart = { pointerId: event.pointerId, isPrimary: event.isPrimary, button: event.button, clientX: event.clientX, clientY: event.clientY };
    const active: Hold = { pointer, item, timer: setTimeout(() => {
      if (hold.current !== active) return;
      hold.current = null;
      if (current.current.pending) return;
      current.current.onBeginMove(item);
      startDrag(pointer, item, false, true);
      setDragMessage("방 꾸미기를 시작했습니다. 가구를 끌어서 옮기세요.");
    }, 450) };
    hold.current = active;
    surface.current?.setPointerCapture(event.pointerId);
  }

  function updateDragAt(clientX: number, clientY: number) {
    const active = drag.current;
    if (!active) return;
    active.clientX = clientX; active.clientY = clientY;
    if (!active.moved && Math.hypot(clientX - active.startX, clientY - active.startY) < 7) return;
    const alreadyMoved = active.moved;
    active.moved = true;
    const latest = current.current;
    const info = latest.catalog.find((entry) => entry.id === active.item.catalogId);
    const point = groundPoint(clientX, clientY, info?.mount);
    let candidate: HousingDragPreview | null = null;
    if (point) {
      const x = Math.round(point.x - active.offsetX), y = Math.round(point.y - active.offsetY);
      const placed = latest.inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation, surface: item.surface ?? "floor" }] : []);
      const valid = canPlaceHousingItem({ inventoryId: active.item.id, x, y, rotation: active.item.rotation, surface: point.surface }, placed, latest.inventory, latest.catalog);
      candidate = { inventoryId: active.item.id, x, y, surface: point.surface, valid };
    }
    if (alreadyMoved && JSON.stringify(active.candidate) === JSON.stringify(candidate)) return;
    active.candidate = candidate;
    engine.current?.preview(candidate);
    setDragPreview({ item: active.item, candidate });
  }

  function updateDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const waiting = hold.current;
    if (waiting?.pointer.pointerId === event.pointerId && Math.hypot(event.clientX - waiting.pointer.clientX, event.clientY - waiting.pointer.clientY) >= 7) cancelHold();
    if (drag.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateDragAt(event.clientX, event.clientY);
  }

  const finishDrag = useCallback((commit: boolean) => {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    if (active.moved || active.fromInventory || !commit) suppressClick.current = true;
    engine.current?.preview(null);
    setDragPreview(null);
    if (surface.current?.hasPointerCapture(active.pointerId)) surface.current.releasePointerCapture(active.pointerId);
    if (!active.moved) return;
    if (commit && active.candidate?.valid && current.current.editing && !current.current.pending) {
      current.current.onDrop(active.item.id, active.candidate.x, active.candidate.y, active.candidate.surface);
      setDragMessage("가구를 놓았습니다. 방 저장을 누르면 배치가 저장됩니다.");
    } else setDragMessage(commit ? "놓을 수 없는 위치입니다. 기존 위치를 유지합니다." : "이동을 취소했습니다. 기존 위치를 유지합니다.");
  }, []);

  useEffect(() => {
    current.current = { inventory, catalog, selectedId, editing, pending, wallpaper, floor, theme, onBeginMove, onSelect, onMove, onDrop, onRotate, onStore };
    engine.current?.update(current.current);
    const waiting = hold.current;
    if (waiting && (editing || pending || !inventory.some((item) => item.id === waiting.item.id && item.x === waiting.item.x && item.y === waiting.item.y && item.surface === waiting.item.surface && item.rotation === waiting.item.rotation))) cancelHold();
    const active = drag.current;
    const item = active && inventory.find((entry) => entry.id === active.item.id);
    if (active && (!editing || pending || !item || item.x !== active.item.x || item.y !== active.item.y || item.rotation !== active.item.rotation || item.surface !== active.item.surface)) finishDrag(false);
  }, [inventory, catalog, selectedId, editing, pending, wallpaper, floor, theme, onBeginMove, onSelect, onMove, onDrop, onRotate, onStore, finishDrag, cancelHold]);

  useImperativeHandle(props.ref, () => ({
    startInventoryDrag: (event, item) => { event.preventDefault(); startDrag(event, item, true); },
    scrollIntoView: () => surface.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    dismissMenu: () => setMenu(null),
  }));

  useEffect(() => {
    const cancel = () => { cancelHold(); if (drag.current) finishDrag(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && (drag.current || hold.current)) { event.preventDefault(); cancel(); } };
    // A held touch keeps scrolling available until it becomes a furniture drag.
    const preventDragScroll = (event: TouchEvent) => { if (drag.current && event.cancelable) event.preventDefault(); };
    const element = surface.current;
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    window.addEventListener("scroll", cancelHold, true);
    element?.addEventListener("touchmove", preventDragScroll, { passive: false });
    return () => { window.removeEventListener("keydown", escape); window.removeEventListener("blur", cancel); window.removeEventListener("scroll", cancelHold, true); element?.removeEventListener("touchmove", preventDragScroll); cancelHold(); };
  }, [finishDrag, cancelHold]);
  useEffect(() => {
    let cancelled = false;
    import("./housing-three-scene").then(({ createHousingScene }) => {
      if (cancelled || !host.current) return;
      try {
        engine.current = createHousingScene(host.current, (next) => { if (!cancelled) { rendererReady.current = true; setProjection(next); } }, () => {
          if (!cancelled) { cancelHold(); finishDrag(false); rendererReady.current = false; setFallback(true); engine.current?.dispose(); engine.current = null; }
        });
        engine.current.update(current.current);
      } catch {
        engine.current?.dispose(); engine.current = null;
        if (!cancelled) setFallback(true);
      }
    }).catch(() => { if (!cancelled) setFallback(true); });
    const element = surface.current;
    return () => {
      cancelled = true;
      const active = drag.current;
      drag.current = null;
      if (active && element?.hasPointerCapture(active.pointerId)) element.releasePointerCapture(active.pointerId);
      engine.current?.dispose(); engine.current = null; rendererReady.current = false;
    };
  }, [finishDrag, cancelHold]);

  const ready = !!projection && !fallback;
  const selected = inventory.find((item) => item.id === selectedId);
  const placements = inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation, surface: item.surface ?? "floor" }] : []);
  const selectedCatalog = catalog.find((item) => item.id === selected?.catalogId);
  function openMenu(item: HousingInventoryItem, clientX?: number, clientY?: number) {
    if (!editing || pending || item.x === null) return;
    onSelect(item);
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return;
    const point = projection?.furniture[item.id];
    const left = clientX === undefined ? (point ? (point.left + point.width / 2) * rect.width / 100 : rect.width / 2) : clientX - rect.left;
    const top = clientY === undefined ? (point ? (point.top + point.height) * rect.height / 100 : rect.height / 2) : clientY - rect.top;
    setMenu({ inventoryId: item.id, left: Math.max(8, Math.min(left, rect.width - 188)), top: Math.max(64, Math.min(top, rect.height - 156)) });
  }
  function fallbackPoint(x: number, y: number, mount: HousingSurface) {
    if (mount === "wall-left") return { left: 8 + x * 7, top: 62 - x * (22 / 6) - y * (37 / 4) };
    if (mount === "wall-right") return { left: 50 + x * 7, top: 40 + x * (22 / 6) - y * (37 / 4) };
    return { left: 50 + (x - y) * 7, top: 40 + (x + y) * (22 / 6) };
  }
  return <div ref={surface} className={styles.scene} data-testid="housing-room-stage" data-lighting={theme === "light" ? "day" : "night"} data-wallpaper={wallpaper} data-floor={floor} data-editing={editing} data-dragging={!!dragPreview} data-renderer={ready ? "webgl" : fallback ? "fallback" : "loading"} role="group" aria-label="나의 방"
    onPointerDownCapture={(event) => {
      cancelHold();
      if ((event.target as HTMLElement).closest("[role=menu]")) return;
      if ((event.target as HTMLElement).closest("[data-room-ui]")) { setMenu(null); return; }
      setMenu(null);
      if (pending || !event.isPrimary || event.button !== 0) return;
      if (!drag.current) suppressClick.current = false;
      let item: HousingInventoryItem | undefined;
      if (ready) {
        const hit = engine.current?.pick(event.clientX, event.clientY);
        if (hit && "inventoryId" in hit) item = inventory.find((entry) => entry.id === hit.inventoryId);
      } else {
        const id = (event.target as HTMLElement).closest<HTMLElement>("[data-inventory-id]")?.dataset.inventoryId;
        item = inventory.find((entry) => entry.id === id);
      }
      if (item) { if (editing) { event.preventDefault(); startDrag(event, item, false); } else startHold(event, item); }
    }}
    onPointerMove={updateDrag}
    onPointerUp={(event) => { if (hold.current?.pointer.pointerId === event.pointerId) cancelHold(); if (drag.current?.pointerId === event.pointerId) { if (drag.current.moved) updateDrag(event); finishDrag(true); } }}
    onPointerCancel={(event) => { if (hold.current?.pointer.pointerId === event.pointerId) cancelHold(); if (drag.current?.pointerId === event.pointerId) finishDrag(false); }}
    onLostPointerCapture={(event) => { if (hold.current?.pointer.pointerId === event.pointerId) cancelHold(); if (drag.current?.pointerId === event.pointerId) finishDrag(false); }}
    onClickCapture={(event) => {
    if ((event.target as HTMLElement).closest("[data-room-ui]")) return;
    if (event.detail > 0 && suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); return; }
    // Geometry picking lets clicks pass through a model's empty bounding-box area.
    // Keyboard activation still uses the ordinary, named DOM buttons below.
    if (!ready || !editing || event.detail === 0) return;
    event.stopPropagation();
    if (pending) return;
    const hit = engine.current?.pick(event.clientX, event.clientY);
    if (hit && "inventoryId" in hit) {
      const item = inventory.find((entry) => entry.id === hit.inventoryId);
      if (item) onSelect(item);
    } else if (selected) {
      const point = groundPoint(event.clientX, event.clientY, selectedCatalog?.mount);
      if (point) onMove(Math.floor(point.x), Math.floor(point.y), point.surface);
    }
  }} onContextMenu={(event) => {
      if (hold.current || drag.current) { event.preventDefault(); return; }
      if (!editing || (event.target as HTMLElement).closest("[data-room-ui]")) return;
      event.preventDefault();
      const hit = ready ? engine.current?.pick(event.clientX, event.clientY) : null;
      const id = hit && "inventoryId" in hit ? hit.inventoryId : !ready ? (event.target as HTMLElement).closest<HTMLElement>("[data-inventory-id]")?.dataset.inventoryId : undefined;
      const item = inventory.find((entry) => entry.id === id);
      if (item) openMenu(item, event.clientX, event.clientY); else setMenu(null);
    }}>
    <div ref={host} className={styles.webglHost} aria-hidden="true" />
    {!ready && <><div className={styles.wallLeft} aria-hidden="true" /><div className={styles.wallRight} aria-hidden="true" /><div className={styles.floor} aria-hidden="true" /></>}
    {editing && Array.from({ length: 36 }, (_, index) => {
      const x = index % 6, y = Math.floor(index / 6);
      const valid = selected && canPlaceHousingItem({ inventoryId: selected.id, x, y, rotation: selected.rotation, surface: "floor" }, placements, inventory, catalog);
      const point = ready ? projection.tiles[index] : null;
      return <button key={index} type="button" className={styles.tile} aria-label={`배치 위치 ${x + 1}열 ${y + 1}행`} disabled={!selected || selectedCatalog?.mount === "wall" || pending} data-valid={!!valid}
        style={point ? { left: `${point.left}%`, top: `${point.top}%`, width: `${point.width}%`, height: `${point.height}%`, clipPath: point.polygon, transform: "none" } : { left: `${50 + (x - y) * 7}%`, top: `${40 + (x + y + 1) * (22 / 6)}%` }} onClick={() => onMove(x, y, "floor")} />;
    })}
    {editing && selectedCatalog?.mount === "wall" && (["wall-left", "wall-right"] as const).flatMap((wall) => Array.from({ length: 24 }, (_, index) => {
      const x = index % 6, y = Math.floor(index / 6);
      const valid = selected && canPlaceHousingItem({ inventoryId: selected.id, x, y, rotation: 0, surface: wall }, placements, inventory, catalog);
      const point = ready ? projection.wallTiles[wall][index] : null;
      const fallback = fallbackPoint(x + .5, y + .5, wall);
      return <button key={wall + index} type="button" className={styles.wallTile} aria-label={`${wall === "wall-left" ? "왼쪽" : "오른쪽"} 벽 배치 위치 ${x + 1}열 ${y + 1}행`} disabled={pending} data-valid={!!valid}
        style={point ? { left: point.left + "%", top: point.top + "%", width: point.width + "%", height: point.height + "%", clipPath: point.polygon } : { left: fallback.left + "%", top: fallback.top + "%", width: "7%", height: "10%", transform: "translate(-50%,-50%)" }} onClick={() => onMove(x, y, wall)} />;
    }))}
    {inventory.filter((item) => item.x !== null && item.y !== null).sort((a, b) => (a.x! + a.y!) - (b.x! + b.y!)).map((item) => {
      const info: HousingCatalogItem | undefined = catalog.find((entry) => entry.id === item.catalogId);
      if (!info) return null;
      const size = getHousingFootprint(info, item.rotation);
      const x = item.x! + size.width / 2, y = item.y! + size.depth / 2;
      const point = ready ? projection.furniture[item.id] : null;
      const fallback = fallbackPoint(x, y, item.surface ?? "floor");
      return <button key={item.id} type="button" className={`${styles.furniture} ${ready ? styles.furnitureHit : ""}`} data-selected={item.id === selectedId} data-inventory-id={item.id} data-surface={item.surface ?? "floor"} data-x={item.x} data-y={item.y} data-rotation={item.rotation} aria-label={`${info.name} 선택`} aria-pressed={item.id === selectedId} disabled={pending}
        style={point ? { left: `${point.left}%`, top: `${point.top}%`, width: `${point.width}%`, height: `${point.height}%`, transform: "none", zIndex: 10 + item.x! + item.y! } : { left: fallback.left + "%", top: fallback.top + "%", transform: item.surface !== "floor" ? "translate(-50%,-50%)" : undefined, width: `${13 + (Math.max(size.width, size.depth) - 1) * 6}%`, zIndex: 10 + item.x! + item.y! }} onClick={() => onSelect(item)} onKeyDown={(event) => {
          if (!editing || pending) return;
          if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); openMenu(item); return; }
          const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, item.surface === "floor" ? -1 : 1], ArrowDown: [0, item.surface === "floor" ? 1 : -1] }[event.key];
          if (direction) { event.preventDefault(); onDrop(item.id, item.x! + direction[0], item.y! + direction[1], item.surface ?? "floor"); }
          if (event.key.toLowerCase() === "r") { event.preventDefault(); onRotate(item.id); }
          if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onStore(item.id); }
        }}>
        {!ready && <FurnitureArt code={info.visualKey} rotation={item.rotation} />}
        <span className={styles.furnitureLabel}>{info.name}</span>
      </button>;
    })}
    {!ready && <div className={styles.avatar} aria-hidden="true"><span className={styles.avatarHead} /><span className={styles.avatarBody} /><span className={styles.avatarShadow} /></div>}
    {dragPreview && <div className={styles.dragFeedback} data-testid="housing-drag-preview" data-valid={!!dragPreview.candidate?.valid} aria-live="polite">
      {dragPreview.candidate?.valid ? "여기에 놓기" : dragPreview.candidate ? "가구가 겹치거나 방 밖이에요" : "방 안으로 끌어 놓으세요"}
    </div>}
    {!ready && dragPreview?.candidate && (() => {
      const item = catalog.find((entry) => entry.id === dragPreview.item.catalogId);
      if (!item) return null;
      const size = getHousingFootprint(item, dragPreview.item.rotation);
      const x = dragPreview.candidate.x + size.width / 2, y = dragPreview.candidate.y + size.depth / 2;
      const fallback = fallbackPoint(x, y, dragPreview.candidate.surface);
      return <div className={styles.dragFallback} data-valid={dragPreview.candidate.valid} style={{ left: fallback.left + "%", top: fallback.top + "%", width: `${13 + (Math.max(size.width, size.depth) - 1) * 6}%` }}><FurnitureArt code={item.visualKey} rotation={dragPreview.item.rotation} /></div>;
    })()}
    {props.children}
    {editing && selected && selected.x !== null && !dragPreview && !menu && <div className={styles.selectionPill} data-room-ui="true"><span>{selectedCatalog?.name}</span><button type="button" aria-label="가구 메뉴 열기" aria-haspopup="menu" onClick={() => openMenu(selected)} disabled={pending}><MoreHorizontal size={20} aria-hidden="true" /></button></div>}
    {editing && menu && !dragPreview && (() => {
      const item = inventory.find((entry) => entry.id === menu.inventoryId);
      if (!item || item.x === null) return null;
      const info = catalog.find((entry) => entry.id === item.catalogId);
      return <FurnitureMenu name={info?.name ?? "가구"} left={menu.left} top={menu.top} canRotate={info?.mount !== "wall"} pending={pending} onClose={() => { setMenu(null); surface.current?.querySelector<HTMLButtonElement>(`[data-inventory-id="${item.id}"]`)?.focus({ preventScroll: true }); }} onRotate={() => { onRotate(item.id); setMenu(null); surface.current?.querySelector<HTMLButtonElement>(`[data-inventory-id="${item.id}"]`)?.focus({ preventScroll: true }); }} onStore={() => { onStore(item.id); setMenu(null); }} />;
    })()}
    <span className={styles.dragAnnouncement} aria-live="polite">{dragMessage}</span>
    {fallback && <span className={styles.fallbackNote}>간편 보기 · 가구 편집 가능</span>}
  </div>;
}

function FurnitureMenu({ name, left, top, canRotate, pending, onClose, onRotate, onStore }: { name: string; left: number; top: number; canRotate: boolean; pending: boolean; onClose: () => void; onRotate: () => void; onStore: () => void }) {
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => { menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true }); }, []);
  return <div ref={menu} className={styles.furnitureMenu} role="menu" aria-label={name + " 메뉴"} data-room-ui="true" style={{ left, top }} onKeyDown={(event) => {
    if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); onClose(); return; }
    const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = (buttons.indexOf(document.activeElement as HTMLButtonElement) + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length; buttons[next]?.focus(); }
  }}><span className={styles.menuTitle}>{name}</span>{canRotate && <button type="button" role="menuitem" disabled={pending} onClick={onRotate}><RotateCw size={15} aria-hidden="true" />가구 회전</button>}<button type="button" role="menuitem" disabled={pending} onClick={onStore}><Package size={15} aria-hidden="true" />가구 보관</button><button type="button" role="menuitem" onClick={onClose}>닫기</button></div>;
}
