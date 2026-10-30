import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { maintainQaWorkspace, waitForQaHttp } from "./qa-startup-maintenance.mjs";

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

test("unavailable or invalid host inspection stops startup before spawning a server", () => {
  for (const result of [{ error: new Error("pwsh missing") }, { status: 1 }, { status: 0, stdout: "bad json" }, { status: 0, stdout: "{}" }]) {
    assert.throws(() => maintainQaWorkspace("3011", { run: () => result, log() {} }), /host process\/port access.*require_escalated.*No server was started or stopped/);
  }
});

test("build-in-progress status preserves the server information", () => {
  const status = maintainQaWorkspace("3011", { run: () => ({ status: 0, stdout: JSON.stringify({ Deleted: [], QaServerRunning: true, QaPortOccupied: true, SkippedReason: "Next.js build in progress" }) }), log() {} });
  assert.equal(status.SkippedReason, "Next.js build in progress");
  assert.equal(status.QaServerRunning, true);
});

test("HTTP readiness retries compilation errors and verifies both hostnames", async () => {
  const hosts = new Set();
  let requests = 0;
  const server = createServer((request, response) => {
    hosts.add(request.headers.host.split(":")[0]);
    response.writeHead(++requests <= 2 ? 503 : 200);
    response.end("QA page");
  });
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  try {
    assert.deepEqual(await waitForQaHttp(port, { timeoutMs: 5000 }), [`http://localhost:${port}/`, `http://127.0.0.1:${port}/`]);
    assert.deepEqual(hosts, new Set(["localhost", "127.0.0.1"]));
    assert.ok(requests >= 4);
  }
  finally { await new Promise(resolve => server.close(resolve)); }
});

test("an open TCP port without an HTTP response never reports readiness", async () => {
  const sockets = new Set();
  const server = createTcpServer(socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, resolve));
  try {
    await assert.rejects(waitForQaHttp(server.address().port, { timeoutMs: 150 }), /QA HTTP readiness failed.*no HTTP response/);
    assert.equal(server.listening, true);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  }
});

test("a failed member hostname prevents readiness even when localhost is healthy", async () => {
  const server = createServer((request, response) => {
    response.writeHead(request.headers.host.startsWith("localhost:") ? 200 : 500);
    response.end();
  });
  await new Promise(resolve => server.listen(0, resolve));
  try {
    await assert.rejects(waitForQaHttp(server.address().port, { timeoutMs: 150 }), /127\.0\.0\.1.*HTTP 500/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
