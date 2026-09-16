import { expect, test } from "@playwright/test";
import {
  RosterAutosave,
  type RosterSaveResult,
  type RosterVersion,
} from "../src/lib/balance/roster-autosave";
import {
  EMPTY_ROSTER,
  type BalanceRoster,
} from "../src/lib/balance/roster-schema";

function roster(...members: string[]): BalanceRoster {
  const value = structuredClone(EMPTY_ROSTER);
  value.team1.dmg = [members[0] ?? null, members[1] ?? null];
  value.team1.tank = members[2] ?? null;
  return value;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("rapid selections flush once with the final roster", async () => {
  const writes: RosterVersion[] = [];
  const queue = new RosterAutosave(
    { roster: roster(), revision: 3 },
    async (value) => {
      writes.push(value);
      return { ok: true, roster: value.roster, revision: value.revision + 1 };
    },
  );
  queue.edit(roster("one"));
  queue.edit(roster("one", "two"));
  queue.edit(roster("one", "two", "three"));
  expect(writes).toHaveLength(0);
  await expect(queue.flush()).resolves.toEqual({ ok: true, revision: 4 });
  expect(writes).toEqual([
    { roster: roster("one", "two", "three"), revision: 3 },
  ]);
  expect(queue.getSnapshot().dirty).toBe(false);
});

test("edits during an in-flight save are serialized and start waits for all edits", async () => {
  const first = deferred<RosterSaveResult>();
  const second = deferred<RosterSaveResult>();
  const writes: RosterVersion[] = [];
  const queue = new RosterAutosave(
    { roster: roster(), revision: 0 },
    async (value) => {
      writes.push(value);
      return writes.length === 1 ? first.promise : second.promise;
    },
  );
  queue.edit(roster("one"));
  const start = queue.flush();
  await Promise.resolve();
  queue.edit(roster("one", "two"));
  queue.edit(roster("one", "two", "three"));
  expect(writes).toHaveLength(1);
  first.resolve({ ok: true, roster: roster("one"), revision: 1 });
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual({
    roster: roster("one", "two", "three"),
    revision: 1,
  });
  expect(queue.getSnapshot().roster).toEqual(roster("one", "two", "three"));
  let ready = false;
  void start.then(() => {
    ready = true;
  });
  await Promise.resolve();
  expect(ready).toBe(false);
  second.resolve({
    ok: true,
    roster: roster("one", "two", "three"),
    revision: 2,
  });
  await expect(start).resolves.toEqual({ ok: true, revision: 2 });
  queue.cancelTimer();
});

test("own realtime acknowledgement cannot wipe newer local selections", async () => {
  const first = deferred<RosterSaveResult>();
  const writes: RosterVersion[] = [];
  const queue = new RosterAutosave(
    { roster: roster(), revision: 5 },
    async (value) => {
      writes.push(value);
      return writes.length === 1
        ? first.promise
        : { ok: true, roster: value.roster, revision: 7 };
    },
  );
  queue.edit(roster("one"));
  const done = queue.flush();
  await Promise.resolve();
  queue.edit(roster("one", "two"));
  queue.receiveRemote({ roster: roster("one"), revision: 6 });
  expect(queue.getSnapshot().roster).toEqual(roster("one", "two"));
  first.resolve({ ok: true, roster: roster("one"), revision: 6 });
  await expect(done).resolves.toEqual({ ok: true, revision: 7 });
  expect(queue.getSnapshot().error).toBeNull();
  queue.receiveRemote({ roster: roster("one"), revision: 6 });
  expect(queue.getSnapshot().roster).toEqual(roster("one", "two"));
  queue.cancelTimer();
});

test("network failure preserves edits and allows a deliberate retry", async () => {
  let attempts = 0;
  const queue = new RosterAutosave(
    { roster: roster(), revision: 1 },
    async (value) => {
      if (++attempts === 1) throw new Error("offline");
      return { ok: true, roster: value.roster, revision: 2 };
    },
  );
  queue.edit(roster("one"));
  await expect(queue.flush()).resolves.toEqual({ ok: false });
  expect(queue.getSnapshot().roster).toEqual(roster("one"));
  expect(queue.getSnapshot().dirty).toBe(true);
  expect(queue.getSnapshot().error).not.toBeNull();
  await expect(queue.retry()).resolves.toEqual({ ok: true, revision: 2 });
  expect(queue.getSnapshot().dirty).toBe(false);
});

test("remote conflict pauses autosave until an explicit local retry", async () => {
  const writes: RosterVersion[] = [];
  const queue = new RosterAutosave(
    { roster: roster(), revision: 1 },
    async (value) => {
      writes.push(value);
      return { ok: true, roster: value.roster, revision: 3 };
    },
  );
  queue.edit(roster("local"));
  queue.receiveRemote({ roster: roster("remote"), revision: 2 });
  await expect(queue.flush()).resolves.toEqual({ ok: false });
  expect(writes).toHaveLength(0);
  expect(queue.getSnapshot().roster).toEqual(roster("local"));
  await expect(queue.retry()).resolves.toEqual({ ok: true, revision: 3 });
  expect(writes).toEqual([{ roster: roster("local"), revision: 2 }]);
});

test("server CAS conflict preserves local edits and can load the latest roster", async () => {
  const queue = new RosterAutosave(
    { roster: roster(), revision: 1 },
    async () => ({
      ok: false,
      error: "conflict",
      conflict: { roster: roster("remote"), revision: 2, editable: true },
    }),
  );
  queue.edit(roster("local"));
  await queue.flush();
  expect(queue.getSnapshot().roster).toEqual(roster("local"));
  queue.loadRemote();
  expect(queue.getSnapshot().roster).toEqual(roster("remote"));
  expect(queue.getSnapshot().revision).toBe(2);
  expect(queue.getSnapshot().dirty).toBe(false);
  expect(queue.getSnapshot().remoteLoads).toBe(1);
});

test("a locked formation cannot be overwritten by retry", async () => {
  let attempts = 0;
  const queue = new RosterAutosave(
    { roster: roster(), revision: 1 },
    async () => {
      attempts++;
      return {
        ok: false,
        error: "started",
        conflict: { roster: roster("remote"), revision: 2, editable: false },
      };
    },
  );
  queue.edit(roster("local"));
  await queue.flush();
  await expect(queue.retry()).resolves.toEqual({ ok: false });
  expect(attempts).toBe(1);
  expect(queue.getSnapshot().roster).toEqual(roster("local"));
});

test("preference-only revision changes rebase unsaved roster edits without a false conflict", async () => {
  const writes: RosterVersion[] = [];
  const queue = new RosterAutosave(
    { roster: roster(), revision: 1 },
    async (value) => {
      writes.push(value);
      return writes.length === 1
        ? {
            ok: false,
            error: "preference changed",
            conflict: { roster: roster(), revision: 3, editable: true },
          }
        : { ok: true, roster: value.roster, revision: 4 };
    },
  );
  queue.edit(roster("local"));
  queue.receiveRemote({ roster: roster(), revision: 2 });
  expect(queue.getSnapshot().error).toBeNull();
  await expect(queue.flush()).resolves.toEqual({ ok: true, revision: 4 });
  expect(writes.map((write) => write.revision)).toEqual([2, 3]);
  expect(queue.getSnapshot().roster).toEqual(roster("local"));
});
