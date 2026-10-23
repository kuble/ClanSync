"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import { canPlaceHousingItem, getHousingFootprint } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem } from "@/lib/housing/types";
import type { HousingDragPreview, RoomProjection, RoomView, createHousingScene } from "./housing-three-scene";
import { FurnitureArt } from "./housing-furniture-art";
import styles from "./housing.module.css";

export type HousingRoomHandle = {
  startInventoryDrag: (event: ReactPointerEvent<HTMLElement>, item: HousingInventoryItem) => void;
  scrollIntoView: () => void;
};
type Props = RoomView & {
  ref?: Ref<HousingRoomHandle>;
  pending: boolean;
  onSelect: (item: HousingInventoryItem) => void;
  onMove: (x: number, y: number) => void;
  onDrop: (inventoryId: string, x: number, y: number) => void;
};
type Drag = {
  pointerId: number; item: HousingInventoryItem; startX: number; startY: number;
  offsetX: number; offsetY: number; moved: boolean; candidate: HousingDragPreview | null;
  fromInventory: boolean; clientX: number; clientY: number;
};

export function HousingRoom(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createHousingScene> | null>(null);
  const rendererReady = useRef(false);
  const drag = useRef<Drag | null>(null);
  const scrollFrame = useRef(0);
  const suppressClick = useRef(false);
  const [dragPreview, setDragPreview] = useState<{ item: HousingInventoryItem; candidate: HousingDragPreview | null } | null>(null);
  const [dragMessage, setDragMessage] = useState("");
  const [projection, setProjection] = useState<RoomProjection | null>(null);
  const [fallback, setFallback] = useState(false);
  const { inventory, catalog, selectedId, editing, pending, wallpaper, floor, onSelect, onMove, onDrop } = props;
  const current = useRef(props);

  function groundPoint(clientX: number, clientY: number) {
    if (rendererReady.current && engine.current) return engine.current.floorPoint(clientX, clientY);
    const rect = surface.current?.getBoundingClientRect();
    if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const u = ((clientX - rect.left) / rect.width * 100 - 50) / 7;
    const v = ((clientY - rect.top) / rect.height * 100 - 40) / (22 / 6);
    return { x: (u + v) / 2, y: (v - u) / 2 };
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, item: HousingInventoryItem, fromInventory: boolean) {
    const latest = current.current;
    if (!latest.editing || latest.pending || drag.current || !event.isPrimary || event.button !== 0 || !surface.current) return;
    const info = latest.catalog.find((entry) => entry.id === item.catalogId);
    if (!info) return;
    const size = getHousingFootprint(info, item.rotation);
    const point = groundPoint(event.clientX, event.clientY);
    event.preventDefault();
    suppressClick.current = false;
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

  function updateDragAt(clientX: number, clientY: number) {
    const active = drag.current;
    if (!active) return;
    active.clientX = clientX; active.clientY = clientY;
    if (!active.moved && Math.hypot(clientX - active.startX, clientY - active.startY) < 7) return;
    const alreadyMoved = active.moved;
    active.moved = true;
    const latest = current.current;
    const point = groundPoint(clientX, clientY);
    let candidate: HousingDragPreview | null = null;
    if (point) {
      const x = Math.round(point.x - active.offsetX), y = Math.round(point.y - active.offsetY);
      const placed = latest.inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation }] : []);
      const valid = canPlaceHousingItem({ inventoryId: active.item.id, x, y, rotation: active.item.rotation }, placed, latest.inventory, latest.catalog);
      candidate = { inventoryId: active.item.id, x, y, valid };
    }
    if (alreadyMoved && JSON.stringify(active.candidate) === JSON.stringify(candidate)) return;
    active.candidate = candidate;
    engine.current?.preview(candidate);
    setDragPreview({ item: active.item, candidate });
  }

  function scrollTowardRoom() {
    scrollFrame.current = 0;
    const active = drag.current;
    if (!active?.moved || !active.fromInventory) return;
    const top = surface.current?.getBoundingClientRect().top ?? 0;
    if (active.clientY < 64 && top < 64 && window.scrollY > 0) {
      const distance = Math.min(14, 64 - top, window.scrollY);
      window.scrollBy({ top: -distance, behavior: "instant" });
      updateDragAt(active.clientX, active.clientY);
    }
    scrollFrame.current = requestAnimationFrame(scrollTowardRoom);
  }

  function updateDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateDragAt(event.clientX, event.clientY);
    if (drag.current?.moved && drag.current.fromInventory && !scrollFrame.current) scrollFrame.current = requestAnimationFrame(scrollTowardRoom);
  }

  const finishDrag = useCallback((commit: boolean) => {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    cancelAnimationFrame(scrollFrame.current); scrollFrame.current = 0;
    if (active.moved || !commit) suppressClick.current = true;
    engine.current?.preview(null);
    setDragPreview(null);
    if (surface.current?.hasPointerCapture(active.pointerId)) surface.current.releasePointerCapture(active.pointerId);
    if (!active.moved) return;
    if (commit && active.candidate?.valid && current.current.editing && !current.current.pending) {
      current.current.onDrop(active.item.id, active.candidate.x, active.candidate.y);
      setDragMessage("가구를 놓았습니다. 방 저장을 누르면 배치가 저장됩니다.");
    } else setDragMessage(commit ? "놓을 수 없는 위치입니다. 기존 위치를 유지합니다." : "이동을 취소했습니다. 기존 위치를 유지합니다.");
  }, []);

  useEffect(() => {
    current.current = { inventory, catalog, selectedId, editing, pending, wallpaper, floor, onSelect, onMove, onDrop };
    engine.current?.update(current.current);
    const active = drag.current;
    const item = active && inventory.find((entry) => entry.id === active.item.id);
    if (active && (!editing || pending || !item || item.x !== active.item.x || item.y !== active.item.y || item.rotation !== active.item.rotation)) finishDrag(false);
  }, [inventory, catalog, selectedId, editing, pending, wallpaper, floor, onSelect, onMove, onDrop, finishDrag]);

  useImperativeHandle(props.ref, () => ({
    startInventoryDrag: (event, item) => startDrag(event, item, true),
    scrollIntoView: () => surface.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
  }));

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && drag.current) { event.preventDefault(); finishDrag(false); } };
    const cancel = () => { if (drag.current) finishDrag(false); };
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("keydown", escape); window.removeEventListener("blur", cancel); };
  }, [finishDrag]);
  useEffect(() => {
    let cancelled = false;
    import("./housing-three-scene").then(({ createHousingScene }) => {
      if (cancelled || !host.current) return;
      try {
        engine.current = createHousingScene(host.current, (next) => { if (!cancelled) { rendererReady.current = true; setProjection(next); } }, () => {
          if (!cancelled) { finishDrag(false); rendererReady.current = false; setFallback(true); engine.current?.dispose(); engine.current = null; }
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
      cancelAnimationFrame(scrollFrame.current); scrollFrame.current = 0;
      if (active && element?.hasPointerCapture(active.pointerId)) element.releasePointerCapture(active.pointerId);
      engine.current?.dispose(); engine.current = null; rendererReady.current = false;
    };
  }, [finishDrag]);

  const ready = !!projection && !fallback;
  const selected = inventory.find((item) => item.id === selectedId);
  const placements = inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation }] : []);
  return <div ref={surface} className={styles.scene} data-wallpaper={wallpaper} data-floor={floor} data-editing={editing} data-dragging={!!dragPreview} data-renderer={ready ? "webgl" : fallback ? "fallback" : "loading"} role="group" aria-label="나의 방"
    onPointerDownCapture={(event) => {
      if (!editing || pending || !event.isPrimary || event.button !== 0) return;
      if (!drag.current) suppressClick.current = false;
      if (ready) {
        const hit = engine.current?.pick(event.clientX, event.clientY);
        if (hit && "inventoryId" in hit) {
          const item = inventory.find((entry) => entry.id === hit.inventoryId);
          if (item) startDrag(event, item, false);
        }
      } else {
        const id = (event.target as HTMLElement).closest<HTMLElement>("[data-inventory-id]")?.dataset.inventoryId;
        const item = inventory.find((entry) => entry.id === id);
        if (item) startDrag(event, item, false);
      }
    }}
    onPointerMove={updateDrag}
    onPointerUp={(event) => { if (drag.current?.pointerId === event.pointerId) { if (drag.current.moved) updateDrag(event); finishDrag(true); } }}
    onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) finishDrag(false); }}
    onLostPointerCapture={(event) => { if (drag.current?.pointerId === event.pointerId) finishDrag(false); }}
    onClickCapture={(event) => {
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
    } else if (hit && selected) onMove(hit.x, hit.y);
  }}>
    <div ref={host} className={styles.webglHost} aria-hidden="true" />
    {!ready && <><div className={styles.wallLeft} aria-hidden="true" /><div className={styles.wallRight} aria-hidden="true" /><div className={styles.floor} aria-hidden="true" /><div className={styles.window} aria-hidden="true"><span /></div></>}
    <div className={styles.roomCorner} aria-hidden="true"><span>MY LITTLE ROOM</span><span>{wallpaper === "midnight" ? "깊은 밤의 여유" : "햇살이 머무는 자리"}</span></div>
    {editing && Array.from({ length: 36 }, (_, index) => {
      const x = index % 6, y = Math.floor(index / 6);
      const valid = selected && canPlaceHousingItem({ inventoryId: selected.id, x, y, rotation: selected.rotation }, placements, inventory, catalog);
      const point = ready ? projection.tiles[index] : null;
      return <button key={index} type="button" className={styles.tile} aria-label={`배치 위치 ${x + 1}열 ${y + 1}행`} disabled={!selected || pending} data-valid={!!valid}
        style={point ? { left: `${point.left}%`, top: `${point.top}%`, width: `${point.width}%`, height: `${point.height}%`, clipPath: point.polygon, transform: "none" } : { left: `${50 + (x - y) * 7}%`, top: `${40 + (x + y + 1) * (22 / 6)}%` }} onClick={() => onMove(x, y)} />;
    })}
    {inventory.filter((item) => item.x !== null && item.y !== null).sort((a, b) => (a.x! + a.y!) - (b.x! + b.y!)).map((item) => {
      const info: HousingCatalogItem | undefined = catalog.find((entry) => entry.id === item.catalogId);
      if (!info) return null;
      const size = getHousingFootprint(info, item.rotation);
      const x = item.x! + size.width / 2, y = item.y! + size.depth / 2;
      const point = ready ? projection.furniture[item.id] : null;
      return <button key={item.id} type="button" className={`${styles.furniture} ${ready ? styles.furnitureHit : ""}`} data-selected={item.id === selectedId} data-inventory-id={item.id} data-x={item.x} data-y={item.y} data-rotation={item.rotation} aria-label={`${info.name} 선택`} aria-pressed={item.id === selectedId} disabled={pending}
        style={point ? { left: `${point.left}%`, top: `${point.top}%`, width: `${point.width}%`, height: `${point.height}%`, transform: "none", zIndex: 10 + item.x! + item.y! } : { left: `${50 + (x - y) * 7}%`, top: `${40 + (x + y) * (22 / 6)}%`, width: `${13 + (Math.max(size.width, size.depth) - 1) * 6}%`, zIndex: 10 + item.x! + item.y! }} onClick={() => onSelect(item)}>
        {!ready && <FurnitureArt code={info.visualKey} rotation={item.rotation} />}
        <span className={styles.furnitureLabel}>{info.name}</span>
      </button>;
    })}
    {!ready && <div className={styles.avatar} aria-hidden="true"><span className={styles.avatarHead} /><span className={styles.avatarBody} /><span className={styles.avatarShadow} /></div>}
    {dragPreview && <div className={styles.dragFeedback} data-testid="housing-drag-preview" data-valid={!!dragPreview.candidate?.valid} aria-live="polite">
      {dragPreview.candidate?.valid ? "여기에 놓기" : dragPreview.candidate ? "가구가 겹치거나 방 밖이에요" : "방 안으로 끌어 놓으세요"}
      <span>놓으면 배치 · Esc로 취소</span>
    </div>}
    {!ready && dragPreview?.candidate && (() => {
      const item = catalog.find((entry) => entry.id === dragPreview.item.catalogId);
      if (!item) return null;
      const size = getHousingFootprint(item, dragPreview.item.rotation);
      const x = dragPreview.candidate.x + size.width / 2, y = dragPreview.candidate.y + size.depth / 2;
      return <div className={styles.dragFallback} data-valid={dragPreview.candidate.valid} style={{ left: `${50 + (x - y) * 7}%`, top: `${40 + (x + y) * (22 / 6)}%`, width: `${13 + (Math.max(size.width, size.depth) - 1) * 6}%` }}><FurnitureArt code={item.visualKey} rotation={dragPreview.item.rotation} /></div>;
    })()}
    <span className={styles.dragAnnouncement} aria-live="polite">{dragMessage}</span>
    {fallback && <span className={styles.fallbackNote}>간편 보기 · 가구 편집 가능</span>}
  </div>;
}
