import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { maintainQaWorkspace, qaPortIsListening } from "./qa-startup-maintenance.mjs";

test("QA startup performs one guarded cleanup and reports reuse of its running server", () => {
  let calls = 0;
  const status = maintainQaWorkspace("3011", {
    run(command, args, options) {
      calls++;
      assert.equal(command, "pwsh");
      assert.ok(args.includes("-Apply") && args.includes("-OnDevelopmentStart"));
      assert.equal(args[args.indexOf("-QaPort") + 1], "3011");
      assert.ok(!args.includes("-IncludeDevBuild"));
      assert.equal(options.windowsHide, true);
      return { status: 0, stdout: JSON.stringify({ Deleted: ["old-report"], QaServerRunning: true, QaPortOccupied: true }) };
    }, log() {},
  });
  assert.equal(calls, 1);
  assert.equal(status.QaServerRunning, true);
});

test("unavailable or invalid cleanup skips deletion without failing startup maintenance", () => {
  for (const result of [{ error: new Error("pwsh missing") }, { status: 1 }, { status: 0, stdout: "bad json" }, { status: 0, stdout: "{}" }]) {
    let warnings = 0;
    assert.equal(maintainQaWorkspace("3011", { run: () => result, log() {}, warn() { warnings++; } }), null);
    assert.equal(warnings, 1);
  }
});

test("build-in-progress status preserves the server information", () => {
  const status = maintainQaWorkspace("3011", { run: () => ({ status: 0, stdout: JSON.stringify({ Deleted: [], QaServerRunning: true, QaPortOccupied: true, SkippedReason: "Next.js build in progress" }) }), log() {} });
  assert.equal(status.SkippedReason, "Next.js build in progress");
  assert.equal(status.QaServerRunning, true);
});

test("fallback port probe detects a listener and its shutdown", async () => {
  const server = createServer(socket => socket.end());
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try { assert.equal(await qaPortIsListening(port), true); }
  finally { await new Promise(resolve => server.close(resolve)); }
  assert.equal(await qaPortIsListening(port), false);
});
