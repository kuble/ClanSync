import { koreanCalendarDate } from "@/lib/clan/event-timezone";

/** A fixed format avoids server/browser locale and time-zone hydration differences. */
export function formatCommunityDate(iso: string): string {
  const date = koreanCalendarDate(new Date(iso));
  return Number.isFinite(date.getTime())
    ? `${date.toISOString().slice(0, 16).replace("T", " ")} KST`
    : "—";
}
