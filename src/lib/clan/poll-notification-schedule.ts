/**
 * D-EVENTS-04 투표 알림 예약 슬롯 (in-app 발송 레이어용 slot_kind + scheduled_at).
 * 발송 시각은 Asia/Seoul 정각 시 보정(고정 UTC+9, 서머타임 없음).
 */

import type { PollNotifyRepeat } from "@/lib/clan/poll-notify-validation";

export type PollSlotKind =
  | "poll_created"
  | "poll_daily"
  | "poll_weekly"
  | "poll_deadline_window"
  | "poll_deadline_1h";

export type PollNotificationSlot = {
  slot_kind: PollSlotKind;
  scheduled_at: Date;
};

const KST = "Asia/Seoul";

function kstCalendar(d: Date): { y: number; m: number; day: number } {
  const s = d.toLocaleDateString("en-CA", { timeZone: KST });
  const [y, m, day] = s.split("-").map((x) => parseInt(x, 10));
  return { y, m, day };
}

/** KST 벽시각 y-m-d H:00 → UTC Instant */
export function utcAtKstHour(
  y: number,
  m: number,
  d: number,
  hourKst: number,
): Date {
  return new Date(Date.UTC(y, m - 1, d, hourKst - 9, 0, 0, 0));
}

function nextKstNotifyOnOrAfter(
  from: Date,
  notifyHour: number,
): Date {
  const { y, m, day } = kstCalendar(from);
  let cand = utcAtKstHour(y, m, day, notifyHour);
  if (cand.getTime() < from.getTime()) {
    cand = new Date(cand.getTime() + 86400000);
  }
  return cand;
}

function pushUnique(slots: PollNotificationSlot[], slot: PollNotificationSlot) {
  if (slot.scheduled_at.getTime() <= 0) return;
  slots.push(slot);
}

function addDeadline1hIfRoom(
  slots: PollNotificationSlot[],
  createdAt: Date,
  deadlineAt: Date,
) {
  const t = new Date(deadlineAt.getTime() - 3600000);
  if (
    t.getTime() > createdAt.getTime() + 120000 &&
    t.getTime() < deadlineAt.getTime() - 30000
  ) {
    pushUnique(slots, { slot_kind: "poll_deadline_1h", scheduled_at: t });
  }
}

const MAX_SLOTS = 48;

/**
 * @param notifyHour 0..23 — KST 정각 (polls.notify_hour)
 */
export function buildPollNotificationSlots(
  createdAt: Date,
  deadlineAt: Date,
  notifyRepeat: PollNotifyRepeat,
  notifyHour: number,
): PollNotificationSlot[] {
  const h = Math.min(23, Math.max(0, Math.floor(notifyHour)));
  if (notifyRepeat === "none") return [];

  const out: PollNotificationSlot[] = [];
  const createdPing = new Date(createdAt.getTime() + 120000);
  if (createdPing.getTime() < deadlineAt.getTime() - 5000) {
    pushUnique(out, { slot_kind: "poll_created", scheduled_at: createdPing });
  }

  if (notifyRepeat === "once") {
    addDeadline1hIfRoom(out, createdAt, deadlineAt);
    return trimSlots(out);
  }

  if (notifyRepeat === "daily") {
    let dayCursor = nextKstNotifyOnOrAfter(
      new Date(createdAt.getTime() + 60000),
      h,
    );
    let guard = 0;
    while (
      dayCursor.getTime() < deadlineAt.getTime() - 60000 &&
      guard < 40 &&
      out.length < MAX_SLOTS
    ) {
      if (dayCursor.getTime() > createdPing.getTime() + 60000) {
        pushUnique(out, { slot_kind: "poll_daily", scheduled_at: dayCursor });
      }
      dayCursor = new Date(dayCursor.getTime() + 86400000);
      guard++;
    }
    addDeadline1hIfRoom(out, createdAt, deadlineAt);
    return trimSlots(out);
  }

  if (notifyRepeat === "weekly") {
    let w = nextKstNotifyOnOrAfter(
      new Date(createdAt.getTime() + 60000),
      h,
    );
    let guard = 0;
    while (
      w.getTime() < deadlineAt.getTime() - 60000 &&
      guard < 14 &&
      out.length < MAX_SLOTS
    ) {
      if (w.getTime() > createdPing.getTime() + 60000) {
        pushUnique(out, { slot_kind: "poll_weekly", scheduled_at: w });
      }
      w = new Date(w.getTime() + 7 * 86400000);
      guard++;
    }
    addDeadline1hIfRoom(out, createdAt, deadlineAt);
    return trimSlots(out);
  }

  if (notifyRepeat === "until_deadline_daily") {
    const windowStart = new Date(deadlineAt.getTime() - 24 * 3600000);
    let cursor = nextKstNotifyOnOrAfter(windowStart, h);
    let guard = 0;
    while (
      cursor.getTime() < deadlineAt.getTime() - 30000 &&
      guard < 14 &&
      out.length < MAX_SLOTS
    ) {
      if (cursor.getTime() >= windowStart.getTime()) {
        pushUnique(out, {
          slot_kind: "poll_deadline_window",
          scheduled_at: cursor,
        });
      }
      cursor = new Date(cursor.getTime() + 86400000);
      guard++;
    }
    addDeadline1hIfRoom(out, createdAt, deadlineAt);
    return trimSlots(out);
  }

  return trimSlots(out);
}

function trimSlots(slots: PollNotificationSlot[]): PollNotificationSlot[] {
  slots.sort((a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime());
  const seen = new Set<string>();
  const uniq: PollNotificationSlot[] = [];
  for (const s of slots) {
    const k = `${s.slot_kind}:${s.scheduled_at.toISOString()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(s);
    if (uniq.length >= MAX_SLOTS) break;
  }
  return uniq;
}
