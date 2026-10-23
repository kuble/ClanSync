import { expect, test } from "@playwright/test";
import { HousingAutosave } from "../src/lib/housing/autosave";
import type { HousingResult, SaveHousingRoomInput } from "../src/lib/housing/types";

const initial: SaveHousingRoomInput = { revision: 3, wallpaper: "cream", floor: "oak", placements: [] };
function accepted(input: SaveHousingRoomInput): HousingResult {
  return { ok: true, state: { room: { revision: input.revision + 1, wallpaper: input.wallpaper, floor: input.floor }, catalog: [], coinBalance: 0,
    inventory: input.placements.map(p => ({ id: p.inventoryId, catalogId: "small-plant", x: p.x, y: p.y, rotation: p.rotation, surface: p.surface })) } };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test("가구·벽지·바닥의 연속 변경을 최신 상태 한 번으로 저장한다", async () => {
  const writes: SaveHousingRoomInput[] = [];
  const queue = new HousingAutosave(initial, async input => { writes.push(input); return accepted(input); });
  queue.edit({ ...initial, wallpaper: "sage" });
  queue.edit({ ...initial, wallpaper: "rose", floor: "ivory" });
  expect(writes).toHaveLength(0);
  expect(await queue.flush()).toBe(true);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ wallpaper: "rose", floor: "ivory", revision: 3 });
  expect(queue.getSnapshot()).toMatchObject({ dirty: false, saving: false, error: null, input: { revision: 4 } });
});

test("저장 중 수정도 유지하고 새 revision으로 차례대로 저장한다", async () => {
  const first = deferred<HousingResult>(), second = deferred<HousingResult>();
  const writes: SaveHousingRoomInput[] = [];
  const queue = new HousingAutosave(initial, async input => { writes.push(input); return writes.length === 1 ? first.promise : second.promise; });
  queue.edit({ ...initial, wallpaper: "sage" });
  const flush = queue.flush(); await Promise.resolve();
  queue.edit({ ...initial, wallpaper: "rose", floor: "walnut" });
  expect(writes).toHaveLength(1);
  first.resolve(accepted(writes[0]));
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({ revision: 4, wallpaper: "rose", floor: "walnut" });
  expect(queue.getSnapshot().input.wallpaper).toBe("rose");
  second.resolve(accepted(writes[1]));
  expect(await flush).toBe(true);
  expect(queue.getSnapshot()).toMatchObject({ dirty: false, input: { revision: 5, wallpaper: "rose" } });
});

test("저장 중 원래 모습으로 되돌려도 서버에 마지막 모습을 반영한다", async () => {
  const first = deferred<HousingResult>(); const writes: SaveHousingRoomInput[] = [];
  const queue = new HousingAutosave(initial, async input => { writes.push(input); return writes.length === 1 ? first.promise : accepted(input); });
  queue.edit({ ...initial, wallpaper: "sage" }); const flush = queue.flush(); await Promise.resolve();
  queue.edit(initial); first.resolve(accepted(writes[0]));
  expect(await flush).toBe(true); expect(writes).toHaveLength(2);
  expect(writes[1]).toMatchObject({ revision: 4, wallpaper: "cream" });
});

test("실패·충돌 시 변경을 보존하고 재시도나 최신 방 선택 전까지 자동 반복하지 않는다", async () => {
  let fail = true; const writes: SaveHousingRoomInput[] = [];
  const queue = new HousingAutosave(initial, async input => { writes.push(input); return fail ? { ok: false, error: "다른 화면에서 수정된 방입니다." } : accepted(input); });
  queue.edit({ ...initial, wallpaper: "sage" }); expect(await queue.flush()).toBe(false);
  queue.edit({ ...initial, wallpaper: "rose" }); expect(await queue.flush()).toBe(false);
  expect(writes).toHaveLength(1); expect(queue.getSnapshot()).toMatchObject({ dirty: true, input: { wallpaper: "rose" } });
  fail = false; expect(await queue.retry()).toBe(true);
  expect(writes[1].wallpaper).toBe("rose");
  queue.edit({ ...initial, floor: "ivory" }); queue.reset({ ...initial, revision: 10 });
  expect(await queue.flush()).toBe(true); expect(writes).toHaveLength(2);
  expect(queue.getSnapshot().input.revision).toBe(10);
});

test("네트워크 예외는 변경을 보존하며 debounce가 자동으로 저장한다", async () => {
  let calls = 0;
  const queue = new HousingAutosave(initial, async input => { if (++calls === 1) throw Error("offline"); return accepted(input); }, 5);
  queue.edit({ ...initial, wallpaper: "midnight" });
  await expect.poll(() => queue.getSnapshot().error).not.toBeNull();
  expect(queue.getSnapshot().dirty).toBe(true);
  expect(await queue.retry()).toBe(true);
  queue.edit({ ...initial, floor: "ivory" });
  await expect.poll(() => queue.getSnapshot().dirty).toBe(false);
  expect(calls).toBe(3);
});
