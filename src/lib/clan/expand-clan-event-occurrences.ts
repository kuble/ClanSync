/**
 * 클랜 일정 템플릿을 월 단위로 펼쳐 캘린더·슬롯에 사용합니다 (D-EVENTS-02).
 * 브라우저 로컬 타임존 기준으로 날짜·요일을 계산합니다.
 */

export type ClanEventRepeat = "none" | "weekly" | "monthly";

/** 서버에서 내려준 행 — 반복 필드 포함 */
export type ClanEventRecord = {
  id: string;
  title: string;
  kind: "intra" | "scrim" | "event";
  start_at: string;
  place: string | null;
  source: "manual" | "scrim_auto";
  repeat: ClanEventRepeat;
  repeat_weekdays: number[] | null;
  /** Postgres time 문자열 HH:mm:ss 또는 null */
  repeat_time: string | null;
};

/** 페이지 props 등과 호환 */
export type SerializedClanEvent = ClanEventRecord;

export type ClanEventOccurrenceVm = {
  key: string;
  /** RSVP·회차 구분 — 해당 일정 시작 시각의 Unix 밀리초 */
  instanceIdx: number;
  template: ClanEventRecord;
  /** 해당 칸에 표시할 시작 시각 */
  displayAt: Date;
};

/** ISO weekday 1 = 월요일 … 7 = 일요일 */
export function isoWeekdayLocal(d: Date): number {
  const dw = d.getDay();
  return dw === 0 ? 7 : dw;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Postgres time 문자열을 로컬 날짜와 합칩니다. */
export function combineLocalDateAndPgTime(
  dateOnly: Date,
  pgTime: string | null,
): Date {
  const d = new Date(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate());
  if (!pgTime) return d;
  const parts = pgTime.split(":").map((x) => parseInt(x, 10));
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  const ss = parts[2] ?? 0;
  d.setHours(hh, mm, ss, 0);
  return d;
}

export function expandClanEventsForMonth(
  templates: ClanEventRecord[],
  year: number,
  monthIndex: number,
): ClanEventOccurrenceVm[] {
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const out: ClanEventOccurrenceVm[] = [];

  for (const t of templates) {
    const anchor = new Date(t.start_at);
    if (Number.isNaN(anchor.getTime())) continue;

    const repeat = t.repeat ?? "none";

    if (repeat === "none") {
      if (anchor.getFullYear() !== year || anchor.getMonth() !== monthIndex) {
        continue;
      }
      const instanceIdx = anchor.getTime();
      out.push({
        key: `${t.id}:${instanceIdx}`,
        instanceIdx,
        template: t,
        displayAt: anchor,
      });
      continue;
    }

    if (repeat === "weekly") {
      const wds = (t.repeat_weekdays ?? []).slice().sort((a, b) => a - b);
      const rt = t.repeat_time;
      if (!rt || wds.length === 0) continue;

      for (let day = 1; day <= dim; day++) {
        const dt = new Date(year, monthIndex, day);
        const iso = isoWeekdayLocal(dt);
        if (!wds.includes(iso)) continue;
        const occ = combineLocalDateAndPgTime(dt, rt);
        if (occ.getTime() < anchor.getTime()) continue;
        const instanceIdx = occ.getTime();
        out.push({
          key: `${t.id}:${instanceIdx}`,
          instanceIdx,
          template: t,
          displayAt: occ,
        });
      }
      continue;
    }

    if (repeat === "monthly") {
      const rt = t.repeat_time;
      if (!rt) continue;
      const dom = anchor.getDate();
      const cand = new Date(year, monthIndex, dom);
      if (cand.getMonth() !== monthIndex) continue;
      const occ = combineLocalDateAndPgTime(cand, rt);
      if (occ.getTime() < anchor.getTime()) continue;
      const instanceIdx = occ.getTime();
      out.push({
        key: `${t.id}:${instanceIdx}`,
        instanceIdx,
        template: t,
        displayAt: occ,
      });
    }
  }

  out.sort((a, b) => a.displayAt.getTime() - b.displayAt.getTime());
  return out;
}

/** RSVP 리스트 키 `${eventId}:${instanceIdx}` 와 동일 규칙 */
export function clanEventRsvpKey(eventId: string, instanceIdx: number): string {
  return `${eventId}:${instanceIdx}`;
}

/** 서버 액션에서 회차 유효성 검증 */
export function isOccurrenceValidForTemplate(
  t: ClanEventRecord,
  instanceIdxMs: number,
): boolean {
  const d = new Date(instanceIdxMs);
  if (Number.isNaN(d.getTime())) return false;
  const expanded = expandClanEventsForMonth([t], d.getFullYear(), d.getMonth());
  return expanded.some((o) => o.instanceIdx === instanceIdxMs);
}

export function dateKeyLocalFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const WD_LABEL = ["월", "화", "수", "목", "금", "토", "일"];

export function repeatSummaryKo(t: ClanEventRecord): string {
  const r = t.repeat ?? "none";
  if (r === "none") return "일회 일정";
  if (r === "weekly") {
    const days = (t.repeat_weekdays ?? [])
      .slice()
      .sort((a, b) => a - b)
      .map((w) => WD_LABEL[w - 1] ?? "?")
      .join("·");
    const tm = t.repeat_time?.slice(0, 5) ?? "";
    return `매주 ${days} ${tm}`;
  }
  const dom = new Date(t.start_at).getDate();
  const tm = t.repeat_time?.slice(0, 5) ?? "";
  return `매월 ${dom}일 ${tm}`;
}
