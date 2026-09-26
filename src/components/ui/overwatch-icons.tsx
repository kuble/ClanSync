import { cn } from "@/lib/utils";
import type { MapType } from "@/lib/balance/map-pools";

/** Official Blizzard artwork; attribution in public/images/overwatch/icons/SOURCES.json. */
export function OverwatchRoleIcon({ role, className }: { role: "tank" | "damage" | "support"; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-4 shrink-0 bg-current", className)} style={{ mask: `url(/images/overwatch/icons/${role}.svg) center / contain no-repeat` }} />;
}

/** ClanSync-drawn mode symbols, not official Blizzard assets. */
export function OverwatchMapIcon({ type, className }: { type: MapType; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cn("size-5 shrink-0", className)}>
    {type === "control" && <><circle cx="12" cy="12" r="9" /><path d="M9 17V7h7l-2 3 2 3H9" /></>}
    {type === "escort" && <><path d="M3 9h12l3 7H3zM6 9V6h6v3M19 5l3 3-3 3M17 8h5" /><circle cx="6" cy="18" r="2" /><circle cx="15" cy="18" r="2" /></>}
    {type === "hybrid" && <><path d="M3 13V3h8L9 6l2 3H3M13 5h4l3 3-3 3M14 15h6l2 4H10v-4z" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></>}
    {type === "push" && <path d="M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4" />}
    {type === "flashpoint" && <><path d="m12 2 3 3-3 3-3-3zM5 9l3 3-3 3-3-3zM19 9l3 3-3 3-3-3zM12 16l3 3-3 3-3-3z" /><path d="m12 9 3 3-3 3-3-3z" fill="currentColor" /></>}
  </svg>;
}
