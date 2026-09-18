import { expect, test } from "@playwright/test";
import { defaultMaForRoster, parseMaSnapshot, parseMaSnapshotForEdit, validateMaSnapshot } from "../src/lib/balance/ma-snapshot";
import { EMPTY_ROSTER } from "../src/lib/balance/roster-schema";

const roster = { ...EMPTY_ROSTER, team1: { ...EMPTY_ROSTER.team1, tank: "player" } };

test("참가자 평가·분석 점수는 -10과 +10, 소수점을 그대로 저장한다", () => {
  for (const score of [-10, -9.75, 0, 8.5, 10]) {
    const snapshot = { player: { m: score, a: -score } };
    expect(parseMaSnapshotForEdit(snapshot)).toEqual({ ok: true, snapshot });
    expect(validateMaSnapshot(roster, snapshot, { allowA: true })).toEqual({ ok: true });
    expect(parseMaSnapshot(snapshot)).toEqual(snapshot);
    expect(defaultMaForRoster(roster, snapshot)).toEqual(snapshot);
  }
});

test("편집 입력은 범위 초과와 잘못된 수를 보정해서 저장하지 않는다", () => {
  for (const value of [-10.01, 10.01, -11, 11, Infinity, NaN, "10", null, undefined]) {
    expect(parseMaSnapshotForEdit({ player: { m: value, a: null } }).ok).toBe(false);
  }
  for (const value of [-10.01, 10.01, Infinity, NaN, "10"]) {
    expect(parseMaSnapshotForEdit({ player: { m: 0, a: value } }).ok).toBe(false);
  }
  for (const value of [-10.01, 10.01]) {
    expect(validateMaSnapshot(roster, { player: { m: value, a: null } }, { allowA: true }).ok).toBe(false);
    expect(validateMaSnapshot(roster, { player: { m: 0, a: value } }, { allowA: true }).ok).toBe(false);
  }
  for (const raw of [null, [], "invalid", { player: [] }, { player: null }]) {
    expect(parseMaSnapshotForEdit(raw).ok).toBe(false);
  }
});

test("미입력 분석 점수·Free 제한·출전자 검증은 유지한다", () => {
  const snapshot = { player: { m: 10, a: null } };
  expect(parseMaSnapshotForEdit({ player: { m: 10 } })).toEqual({ ok: true, snapshot });
  expect(validateMaSnapshot(roster, snapshot, { allowA: false })).toEqual({ ok: true });
  expect(validateMaSnapshot(roster, { player: { m: 0, a: 10 } }, { allowA: false }).ok).toBe(false);
  expect(validateMaSnapshot(roster, { outsider: { m: 0, a: null } }, { allowA: true }).ok).toBe(false);
  // Existing stored data still uses the tolerant read path.
  expect(parseMaSnapshot({ player: { m: 20, a: -20 } })).toEqual({ player: { m: 10, a: -10 } });
});
