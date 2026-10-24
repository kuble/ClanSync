"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { itemPosition, placementRail, shelfGeometry, type ShowcaseCabinet, type ShowcaseItem, type ShowcaseProduct } from "@/lib/showcase/domain";
import { showcaseArtRatio, showcaseDisplayWidth } from "@/lib/showcase/art";
import { ShowcaseArt } from "./showcase-art";
import { ShowcaseWallpaper } from "./showcase-wallpaper";
import styles from "./showcase.module.css";

export function contains(bounds: DOMRect | undefined, x: number, y: number) {
  return !!bounds && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export function dropPosition(bounds: DOMRect | undefined, cabinet: ShowcaseCabinet, product: ShowcaseProduct, clientX: number, clientY: number) {
  if (!bounds || !contains(bounds, clientX, clientY)) return null;
  const y = (clientY - bounds.top) / bounds.height * 100;
  return [0, 1, 2].map(shelf => {
    const rail = placementRail(cabinet.template, shelf, product.kind);
    const width = Math.min(showcaseDisplayWidth(product), rail.width);
    const x = rail.width === width ? 50 : Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width * 100 - rail.left - width / 2) / (rail.width - width) * 100));
    const position = itemPosition(cabinet, { id: "preview", catalogId: product.id, shelf, x, layer: 0 }, product);
    return { shelf, x: Math.round(x), distance: Math.abs(position.top - y) };
  }).reduce((best, candidate) => candidate.distance < best.distance ? candidate : best);
}

export function ShowcaseScene({ cabinet, catalog, selected, select, move, sceneRef, preview, storeAt, onDrag }: {
  cabinet: ShowcaseCabinet; catalog: ShowcaseProduct[]; selected?: string | null;
  select?: (id: string) => void; move?: (id: string, x: number, shelf: number) => void;
  sceneRef?: RefObject<HTMLDivElement | null>; preview?: ShowcaseItem | null;
  storeAt?: (id: string, x: number, y: number) => boolean;
  onDrag?: (point: { x: number; y: number; product: ShowcaseProduct } | null) => void;
}) {
  const localScene = useRef<HTMLDivElement>(null);
  const scene = sceneRef ?? localScene;
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ id: string; x: number; shelf: number } | null>(null);
  useEffect(() => {
    const reset = () => { drag.current = null; setDragPosition(null); onDrag?.(null); };
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") reset(); };
    window.addEventListener("keydown", cancel);
    window.addEventListener("blur", reset);
    return () => { window.removeEventListener("keydown", cancel); window.removeEventListener("blur", reset); };
  }, [onDrag]);
  function pointerPosition(clientX: number, clientY: number, id: string) {
    const item = cabinet.items.find(i => i.id === id);
    const product = catalog.find(p => p.id === item?.catalogId);
    const position = product && dropPosition(scene.current?.getBoundingClientRect(), cabinet, product, clientX, clientY);
    return position ? { id, x: position.x, shelf: position.shelf } : null;
  }
  const items = preview ? [...cabinet.items, preview] : cabinet.items;
  return <div ref={scene} className={`${styles.scene} ${styles[cabinet.background]} ${cabinet.template === "focus" ? styles.focus : ""}`} data-testid="showcase-scene" aria-label="취향 전시">
    <div className={styles.backboard} aria-hidden="true" />
    <ShowcaseWallpaper template={cabinet.template} background={cabinet.background} />
    <div className={styles.ambient} aria-hidden="true" />
    {items.map(original => {
      const product = catalog.find(p => p.id === original.catalogId);
      if (product?.kind !== "light") return null;
      const item = dragPosition?.id === original.id ? { ...original, ...dragPosition } : original;
      const position = itemPosition(cabinet, item, product);
      const top = position.top + position.width / showcaseArtRatio(product.sprite, product.image_path) * 1.3 * .83;
      return <div key={item.id} aria-hidden="true" data-testid="showcase-light-beam" className={styles.lightBeam} style={{ left: `${position.left}%`, top: `${top}%`, width: `${position.width * 5}%`, height: `${Math.max(5, shelfGeometry(cabinet.template, item.shelf).top - top + 2)}%` }} />;
    })}
    {[0, 1, 2].map(index => { const shelf = shelfGeometry(cabinet.template, index); return <div key={index} className={styles.shelf} data-shelf={index} style={{ left: `${shelf.left}%`, width: `${shelf.width}%`, top: `${shelf.top}%` }} aria-hidden="true"><svg viewBox="10 148 1180 134" preserveAspectRatio="none"><image href="/images/showcase/shelf-v2.webp" width="1200" height="400" /></svg></div>; })}
    {items.map(original => {
      const product = catalog.find(p => p.id === original.catalogId);
      if (!product) return null;
      const item = dragPosition?.id === original.id ? { ...original, ...dragPosition } : original;
      const position = itemPosition(cabinet, item, product);
      const visual = <><ShowcaseArt sprite={product.sprite} imagePath={product.image_path} />{product.kind === "label" && <span className={styles.labelText}>{item.text || "나의 취향"}</span>}</>;
      const className = `${styles.item} ${styles[product.kind]} ${selected === item.id ? styles.selected : ""} ${item.id === "preview" ? styles.dropPreview : ""}`;
      const style = { left: `${position.left}%`, top: `${position.top}%`, width: `${position.width}%`, aspectRatio: showcaseArtRatio(product.sprite, product.image_path), zIndex: (product.kind === "goods" ? 10 : 30) + item.shelf * 10 + item.layer };
      return select && item.id !== "preview" ? <button key={item.id} type="button" className={className} style={style} aria-label={`${product.name} 선택`} aria-pressed={selected === item.id}
        onClick={() => select(item.id)}
        onPointerDown={event => { if (!move || (event.pointerType === "mouse" && event.button !== 0)) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: item.id, startX: event.clientX, startY: event.clientY, moved: false }; }}
        onPointerMove={event => { if (!drag.current || !move) return; if (Math.hypot(event.clientX-drag.current.startX,event.clientY-drag.current.startY)>6) drag.current.moved = true; if (drag.current.moved) { setDragPosition(pointerPosition(event.clientX,event.clientY,item.id)); onDrag?.({x:event.clientX,y:event.clientY,product}); } }}
        onPointerUp={event => { if (drag.current?.moved && !storeAt?.(item.id,event.clientX,event.clientY)) { const pos = pointerPosition(event.clientX,event.clientY,item.id); if(pos) move?.(pos.id,pos.x,pos.shelf); } drag.current=null; setDragPosition(null); onDrag?.(null); }}
        onPointerCancel={() => { drag.current=null; setDragPosition(null); onDrag?.(null); }}
        onLostPointerCapture={() => { drag.current=null; setDragPosition(null); onDrag?.(null); }}
        onKeyDown={event => { if (!move) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(item.id,Math.max(0,Math.min(100,item.x+(event.key === "ArrowLeft" ? -2 : 2))),item.shelf); } }}>
        {visual}
      </button> : <div key={item.id} className={className} style={style} role="img" aria-label={`${product.name}${item.text ? ` · ${item.text}` : ""}`}>{visual}</div>;
    })}
    {!items.length && <p className={styles.emptyScene}>좋아하는 것부터 하나씩.</p>}
  </div>;
}

