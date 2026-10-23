"use client";

import { useEffect, useRef, useState } from "react";
import { canPlaceHousingItem, getHousingFootprint } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem } from "@/lib/housing/types";
import type { RoomProjection, RoomView, createHousingScene } from "./housing-three-scene";
import { FurnitureArt } from "./housing-furniture-art";
import styles from "./housing.module.css";

type Props = RoomView & { pending: boolean; onSelect: (item: HousingInventoryItem) => void; onMove: (x: number, y: number) => void };

export function HousingRoom(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createHousingScene> | null>(null);
  const [projection, setProjection] = useState<RoomProjection | null>(null);
  const [fallback, setFallback] = useState(false);
  const { inventory, catalog, selectedId, editing, pending, wallpaper, floor, onSelect, onMove } = props;
  const current = useRef<RoomView>({ inventory, catalog, selectedId, editing, wallpaper, floor });
  useEffect(() => {
    current.current = { inventory, catalog, selectedId, editing, wallpaper, floor };
    engine.current?.update(current.current);
  }, [inventory, catalog, selectedId, editing, wallpaper, floor]);
  useEffect(() => {
    let cancelled = false;
    import("./housing-three-scene").then(({ createHousingScene }) => {
      if (cancelled || !host.current) return;
      try {
        engine.current = createHousingScene(host.current, (next) => { if (!cancelled) setProjection(next); }, () => {
          if (!cancelled) { setFallback(true); engine.current?.dispose(); engine.current = null; }
        });
        engine.current.update(current.current);
      } catch {
        engine.current?.dispose(); engine.current = null;
        if (!cancelled) setFallback(true);
      }
    }).catch(() => { if (!cancelled) setFallback(true); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, []);

  const ready = !!projection && !fallback;
  const selected = inventory.find((item) => item.id === selectedId);
  const placements = inventory.flatMap((item) => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation }] : []);
  return <div className={styles.scene} data-wallpaper={wallpaper} data-floor={floor} data-editing={editing} data-renderer={ready ? "webgl" : fallback ? "fallback" : "loading"} role="group" aria-label="나의 방" onClickCapture={(event) => {
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
    {fallback && <span className={styles.fallbackNote}>간편 보기 · 가구 편집 가능</span>}
  </div>;
}
