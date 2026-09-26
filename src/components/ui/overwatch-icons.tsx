import { cn } from "@/lib/utils";
import type { MapType } from "@/lib/balance/map-pools";

/** Official Blizzard artwork; attribution in public/images/overwatch/icons/SOURCES.json. */
export function OverwatchRoleIcon({ role, className }: { role: "tank" | "damage" | "support"; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-4 shrink-0 bg-current", className)} style={{ mask: `url(/images/overwatch/icons/${role}.svg) center / contain no-repeat` }} />;
}

/** Redrawn from user-provided references; original design rights are not cleared. */
export function OverwatchMapIcon({ type, className }: { type: MapType | "assault"; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-5 shrink-0 bg-current", className)} style={{ mask: `url(/images/overwatch/icons/mode-${type}.svg) center / contain no-repeat` }} />;
}
