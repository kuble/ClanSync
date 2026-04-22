/** KST(Asia/Seoul) 기준 날짜 파트 — 통계·활동일 집계에 사용 */

export function toKstParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return { y, m, day };
}

export function isoToKstYmd(iso: string): string {
  const { y, m, day } = toKstParts(new Date(iso));
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function inKstMonth(iso: string, y: number, m: number): boolean {
  const p = toKstParts(new Date(iso));
  return p.y === y && p.m === m;
}

export function inKstYear(iso: string, y: number): boolean {
  return toKstParts(new Date(iso)).y === y;
}
