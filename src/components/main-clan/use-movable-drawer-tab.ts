"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import styles from "./movable-drawer-tab.module.css";

const storageKey = "clansync:drawer-tab-position";
const topInset = 68;
const bottomInset = 12;
const narrow = () => window.matchMedia("(width < 1000px)").matches;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const subscribe = (notify: () => void) => {
  window.addEventListener(storageKey, notify);
  return () => window.removeEventListener(storageKey, notify);
};
const readPosition = () => {
  const saved = sessionStorage.getItem(storageKey);
  return saved !== null && Number.isFinite(Number(saved)) ? clamp(Number(saved)) : null;
};

export function useMovableDrawerTab() {
  const saved = useSyncExternalStore(subscribe, readPosition, () => null);
  const [preview, setPreview] = useState<number | null>(null);
  const position = preview ?? saved;
  const [dragging, setDragging] = useState(false);
  const press = useRef<{
    id: number; x: number; y: number; offset: number;
    held: boolean; timer: number; position?: number;
  } | null>(null);
  const blockClick = useRef(false);

  useEffect(() => () => window.clearTimeout(press.current?.timer), []);

  function finish(event: PointerEvent<HTMLElement>) {
    const active = press.current;
    if (!active || active.id !== event.pointerId) return;
    window.clearTimeout(active.timer);
    press.current = null;
    if (active.position !== undefined) {
      sessionStorage.setItem(storageKey, String(active.position));
      window.dispatchEvent(new Event(storageKey));
    }
    setPreview(null);
    setDragging(false);
  }

  return {
    className: styles.tab,
    handlers: {
      style: position === null ? undefined : {
        "--dock-top": `calc(${position * 100}% + ${topInset * (1 - position) - bottomInset * position}px)`,
        "--dock-shift": `${-position * 100}%`,
      } as CSSProperties,
      "data-dragging": dragging || undefined,
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (!narrow() || !event.isPrimary || event.button !== 0) return;
        const target = event.target as Element;
        if (!target.closest("button")) return;
        target.setPointerCapture(event.pointerId);
        blockClick.current = false;
        const active = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: event.clientY - event.currentTarget.getBoundingClientRect().top, held: false, timer: 0 };
        press.current = active;
        active.timer = window.setTimeout(() => {
          active.held = true;
          blockClick.current = true;
          setDragging(true);
        }, 400);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const active = press.current;
        if (!active || active.id !== event.pointerId) return;
        if (active.held) {
          const travel = Math.max(1, window.innerHeight - topInset - bottomInset - event.currentTarget.offsetHeight);
          active.position = clamp((event.clientY - active.offset - topInset) / travel);
          setPreview(active.position);
        } else if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8) {
          blockClick.current = true;
          finish(event);
        }
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onContextMenu(event: MouseEvent<HTMLElement>) {
        if (narrow() && press.current) event.preventDefault();
      },
      onClickCapture(event: MouseEvent<HTMLElement>) {
        if (!blockClick.current || event.detail === 0) return;
        event.preventDefault();
        event.stopPropagation();
        blockClick.current = false;
      },
    },
  };
}
