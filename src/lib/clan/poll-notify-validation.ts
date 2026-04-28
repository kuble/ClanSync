/** D-EVENTS-04 마감 × 알림 반복 하한 검증 (서버 액션 최종 게이트). */

export type PollNotifyRepeat =
  | "none"
  | "once"
  | "daily"
  | "weekly"
  | "until_deadline_daily";

const MS_H = 3600000;
const MS_D = 86400000;

export type PollNotifyValidateResult =
  | { ok: true; warn60d: boolean }
  | { ok: false; error: string };

/**
 * @param nowMs 서버 시각 기준
 * @param deadlineMs 마감 시각(ms)
 */
export function validatePollNotifyAgainstDeadline(
  nowMs: number,
  deadlineMs: number,
  notifyRepeat: PollNotifyRepeat,
): PollNotifyValidateResult {
  if (!(deadlineMs > nowMs)) {
    return { ok: false, error: "마감은 현재 시각 이후여야 합니다." };
  }

  const span = deadlineMs - nowMs;

  if (notifyRepeat === "none") {
    return { ok: true, warn60d: span > 60 * MS_D };
  }

  if (notifyRepeat === "once") {
    if (span < MS_H) {
      return {
        ok: false,
        error:
          "'한 번' 알림은 마감이 최소 1시간 이후여야 합니다. 마감을 늘리거나 알림을 끄세요.",
      };
    }
    return { ok: true, warn60d: span > 60 * MS_D };
  }

  if (notifyRepeat === "daily") {
    if (span < 48 * MS_H) {
      return {
        ok: false,
        error:
          "48시간 이내 마감에는 '매일' 반복 알림을 사용할 수 없습니다. '한 번' 또는 '마감 전까지 매일'을 선택해 주세요.",
      };
    }
    return { ok: true, warn60d: span > 60 * MS_D };
  }

  if (notifyRepeat === "weekly") {
    if (span < 14 * MS_D) {
      return {
        ok: false,
        error:
          "14일 이내 마감에는 '매주' 반복 알림을 사용할 수 없습니다.",
      };
    }
    return { ok: true, warn60d: span > 180 * MS_D };
  }

  if (notifyRepeat === "until_deadline_daily") {
    if (span < 24 * MS_H) {
      return {
        ok: false,
        error:
          "24시간 이내 마감에는 '마감 전까지 매일'을 사용할 수 없습니다. '한 번' 알림을 권장합니다.",
      };
    }
    return { ok: true, warn60d: span > 60 * MS_D };
  }

  return { ok: false, error: "알림 반복 설정이 올바르지 않습니다." };
}

export function parsePollNotifyRepeat(raw: string): PollNotifyRepeat {
  const v = raw.trim();
  if (
    v === "none" ||
    v === "once" ||
    v === "daily" ||
    v === "weekly" ||
    v === "until_deadline_daily"
  ) {
    return v;
  }
  return "none";
}
