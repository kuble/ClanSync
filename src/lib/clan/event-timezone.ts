/** Recurring clan schedules are Korean wall time, independent of server/browser TZ. */
export const KST_OFFSET = 9 * 60 * 60 * 1000;
export function koreanCalendarDate(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET);
}
export function koreanTime(date: Date): string {
  const local = koreanCalendarDate(date);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}:${String(local.getUTCSeconds()).padStart(2, "0")}.${String(local.getUTCMilliseconds()).padStart(3, "0")}`;
}
export function koreanDateTime(year: number, month: number, day: number, time: string): Date {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month, day, h, m, Math.floor(s), Math.round((s % 1) * 1000)) - KST_OFFSET);
}
