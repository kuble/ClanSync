import type { BalanceRoster } from "@/lib/balance/roster-schema";
import { rosterAssignedUserIds } from "@/lib/balance/roster-schema";

/** Manual / Auto 점수 한 줄(09-BalanceMaker). A는 Premium 편집·표시. */
export type MaEntry = {
  m: number;
  a: number | null;
};

export type MaSnapshot = Record<string, MaEntry>;

export const MA_SCORE_MIN = -10;
export const MA_SCORE_MAX = 10;

function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= MA_SCORE_MIN && value <= MA_SCORE_MAX;
}

/** 저장 입력은 조회용 보정 전에 검사하여 범위를 벗어난 값을 묵시적으로 바꾸지 않는다. */
export function parseMaSnapshotForEdit(raw: unknown):
  | { ok: true; snapshot: MaSnapshot }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "점수 데이터 형식이 올바르지 않습니다." };
  }
  const snapshot: MaSnapshot = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: "점수 데이터 형식이 올바르지 않습니다." };
    }
    const { m, a } = entry as Record<string, unknown>;
    if (!isValidScore(m)) {
      return { ok: false, error: `평가 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.` };
    }
    if (a !== null && a !== undefined && !isValidScore(a)) {
      return { ok: false, error: `분석 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.` };
    }
    snapshot[id] = { m, a: a === null || a === undefined ? null : a as number };
  }
  return { ok: true, snapshot };
}

export function parseMaSnapshot(raw: unknown): MaSnapshot {
  if (!raw || typeof raw !== "object") return {};
  const out: MaSnapshot = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const m = typeof o.m === "number" && Number.isFinite(o.m) ? o.m : 0;
    const a =
      o.a === null || o.a === undefined
        ? null
        : typeof o.a === "number" && Number.isFinite(o.a)
          ? o.a
          : null;
    out[k] = { m: clampScore(m), a: a === null ? null : clampScore(a) };
  }
  return out;
}

function clampScore(n: number): number {
  return Math.min(MA_SCORE_MAX, Math.max(MA_SCORE_MIN, n));
}

/** 로스터에 있는 출전자에게 기본 m=0, a=null */
export function defaultMaForRoster(
  roster: BalanceRoster,
  existing: MaSnapshot,
): MaSnapshot {
  const ids = rosterAssignedUserIds(roster);
  const next: MaSnapshot = {};
  for (const id of ids) {
    const prev = existing[id];
    next[id] = {
      m: clampScore(prev?.m ?? 0),
      a: prev?.a === undefined || prev?.a === null ? null : clampScore(prev.a),
    };
  }
  return next;
}

export function validateMaSnapshot(
  roster: BalanceRoster,
  snap: MaSnapshot,
  opts: { allowA: boolean },
): { ok: true } | { ok: false; error: string } {
  const allowed = new Set(rosterAssignedUserIds(roster));
  for (const uid of Object.keys(snap)) {
    if (!allowed.has(uid)) {
      return { ok: false, error: "라인업에 없는 멤버 점수가 포함되어 있습니다." };
    }
    const e = snap[uid];
    if (!e) continue;
    if (!isValidScore(e.m)) {
      return { ok: false, error: `평가 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.` };
    }
    if (e.a !== null) {
      if (!opts.allowA) {
        return { ok: false, error: "분석 점수는 Premium 클랜에서만 저장할 수 있습니다." };
      }
      if (!isValidScore(e.a)) {
        return { ok: false, error: `분석 점수는 ${MA_SCORE_MIN}부터 ${MA_SCORE_MAX}까지 입력해 주세요.` };
      }
    }
  }
  return { ok: true };
}
