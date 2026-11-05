import { test } from "node:test";
import assert from "node:assert/strict";
import { assertDatabaseRead, databaseAccessDenied, DatabaseReadError, retryDatabaseRead } from "../src/lib/supabase/read-query.ts";

const ok = { status: 200, error: null, data: ["current"] };
const failed = (status, code = "", message = "upstream unavailable") => ({ status, error: { code, message }, data: null });

test("transient read failure is retried once and returns the fresh response", async () => {
  let calls = 0;
  const result = await retryDatabaseRead("test.read", async () => ++calls === 1 ? failed(502) : ok);
  assert.equal(calls, 2);
  assert.equal(result, ok);
});

test("persistent read failure is bounded and remains distinguishable from denied access", async () => {
  let calls = 0;
  const result = await retryDatabaseRead("test.read", async () => { calls++; return failed(502); });
  assert.equal(calls, 2);
  assert.equal(databaseAccessDenied(result), false);
  assert.throws(() => assertDatabaseRead("test.read", result), error => error instanceof DatabaseReadError && error.status === 502);
});

test("permission, validation and cancellation errors are never retried", async () => {
  for (const result of [failed(401), failed(403), failed(400, "42501"), failed(400, "22023"), failed(0, "20", "AbortError: cancelled")]) {
    let calls = 0;
    assert.equal(await retryDatabaseRead("test.read", async () => { calls++; return result; }), result);
    assert.equal(calls, 1);
  }
  assert.equal(databaseAccessDenied(failed(403)), true);
  assert.equal(databaseAccessDenied(failed(400, "42501")), true);
});

test("transport and temporary database failures can recover without retrying a successful empty read", async () => {
  for (const result of [failed(0), failed(503), failed(500, "57014")]) {
    let calls = 0;
    assert.equal(await retryDatabaseRead("test.read", async () => ++calls === 1 ? result : ok), ok);
    assert.equal(calls, 2);
  }
  let calls = 0;
  const empty = { ...ok, data: null };
  assert.equal(await retryDatabaseRead("test.read", async () => { calls++; return empty; }), empty);
  assert.equal(calls, 1);
});

test("diagnostics exclude raw upstream content and malformed error codes", async (t) => {
  const logger = t.mock.method(console, "warn", () => {});
  await retryDatabaseRead("test.read", async () => failed(400, "private-secret-body", "private-secret-body"));
  const output = JSON.stringify(logger.mock.calls.map(call => call.arguments));
  assert.match(output, /DB_READ_FAILED/);
  assert.doesNotMatch(output, /private-secret-body/);
});
