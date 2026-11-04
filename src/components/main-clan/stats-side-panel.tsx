"use client";
import { useMovableDrawerTab } from "./use-movable-drawer-tab";

import { useSyncExternalStore, type Ref } from "react";
import type { LucideIcon } from "lucide-react";

const narrowQuery = "(width < 1000px)";
function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(narrowQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isNarrow = () => window.matchMedia(narrowQuery).matches;
const serverNarrow = () => false;

export function useStatsDrawerLayout() {
  return useSyncExternalStore(subscribeNarrow, isNarrow, serverNarrow);
}

export function StatsDrawerTab({ label, title, icon: Icon, open, onOpen, ref }: {
  label: string; title: string; icon: LucideIcon; open: boolean; onOpen: () => void; ref?: Ref<HTMLButtonElement>;
}) {
  const dock = useMovableDrawerTab();
  return <button {...dock.handlers} ref={ref} type="button" aria-label={label} title={title} aria-haspopup="dialog" aria-expanded={open}
    aria-hidden={open || undefined} tabIndex={open ? -1 : 0} onClick={onOpen}
    className={`${dock.className} fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-primary/25 bg-background/95 px-2 py-3 text-xs font-semibold text-primary shadow-lg focus-visible:outline-2 focus-visible:outline-ring min-[1000px]:hidden ${open ? "invisible pointer-events-none" : ""}`}>
    <Icon className="size-4" aria-hidden /><span className="[writing-mode:vertical-rl]">{label}</span>
  </button>;
}
