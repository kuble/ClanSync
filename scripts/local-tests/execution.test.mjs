import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { executionPlan, formatSummary } from "./execution.mjs";
import { summarize } from "./state.mjs";

test("선택 E2E는 개발 모드, 전체·CI·명시적 운영 검사는 빌드와 trace를 유지한다", () => {
  const file = "e2e/smoke.spec.ts:7";
  assert.deepEqual(executionPlan("e2e", [file], {}), { requested: [file], production: false, trace: "off" });
  for (const [args, env] of [[[], {}], [[], { LOCAL_TEST_DEV_SERVER: "1" }], [[file], { CI: "1", LOCAL_TEST_DEV_SERVER: "1" }], [[file, "--production"], {}], [[file], { LOCAL_TEST_DEV_SERVER: "0" }]]) {
    const plan = executionPlan("e2e", args, env);
    assert.equal(plan.production, true);
    assert.equal(plan.trace, "retain-on-failure");
  }
  assert.equal(executionPlan("e2e", [file, "--trace"], {}).trace, "retain-on-failure");
  assert.deepEqual(executionPlan("db", ["scripts/formation-db.test.mjs"], {}), { requested: ["scripts/formation-db.test.mjs"], production: false, trace: "off" });
  assert.throws(() => executionPlan("e2e", ["--unknown"], {}));
  assert.throws(() => executionPlan("db", ["--production"], {}));
  assert.throws(() => executionPlan("other", [], {}));
});

test("요약은 성공 목록 없이 실패 위치·원인·미완료·정리 실패를 표시하고 길이를 제한한다", () => {
  const events = [
    { type: "test", id: "ok", status: "pass", title: "성공 상세 제목" },
    { type: "test", id: "pending", status: "start" },
    ...Array.from({ length: 7 }, (_, i) => ({ type: "test", id: `fail${i}`, status: "fail", file: "sample.ts", line: 12, title: "실패 검사", error: "assertion mismatch " + "x".repeat(6000) })),
    { type: "cleanup", status: "fail", error: "정리 오류" },
    { type: "end", status: "fail" },
  ];
  const output = formatSummary(summarize(events));
  assert.match(output, /통과 1 · 실패 7 · 건너뜀 0 · 미완료 1/);
  assert.match(output, /sample.ts:12 실패 검사/);
  assert.match(output, /assertion mismatch/);
  assert.match(output, /그 외 실패 2개/);
  assert.match(output, /정리: 미완료\n정리 오류/);
  assert.doesNotMatch(output, /성공 상세 제목/);
  assert.ok(output.length < 8500);
});

for (const mode of ["node", "playwright"]) {
  test(`${mode} 실제 실행의 성공·실패·건너뜀을 요약하고 실패 종료와 인증값 마스킹을 유지한다`, () => {
    const dir = mkdtempSync(resolve(tmpdir(), "clansync-report-"));
    try {
      const events = resolve(dir, "events.jsonl");
      const fixture = resolve(dir, mode === "node" ? "fixture.test.mjs" : "fixture.spec.cjs");
      const root = resolve(import.meta.dirname, "../..");
      const library = mode === "node" ? "const { test } = await import('node:test');" : `const { test } = require(${JSON.stringify(resolve(root, "node_modules/@playwright/test"))});`;
      writeFileSync(fixture, `${library}\ntest('ok',()=>{}); test('broken',()=>{throw new Error('assertion mismatch access_token=secret-value')}); test.skip('later',()=>{});`);
      let args;
      if (mode === "node") args = ["--test", `--test-reporter=${pathToFileURL(resolve(root, "scripts/local-tests/node-reporter.mjs")).href}`, fixture];
      else {
        const config = resolve(dir, "playwright.config.cjs");
        writeFileSync(config, `module.exports = {testDir: ${JSON.stringify(dir)}, retries:0, workers:1, outputDir:${JSON.stringify(resolve(dir, "artifacts"))}};`);
        args = [resolve(root, "node_modules/@playwright/test/cli.js"), "test", `--config=${config}`, `--reporter=${resolve(root, "scripts/local-tests/playwright-reporter.mjs")},list`];
      }
      const env = { ...process.env, CLANSYNC_TEST_EVENTS: events, FORCE_COLOR: "0" };
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: "utf8", timeout: 60000, windowsHide: true });
      assert.equal(result.status, 1, result.stderr);
      const raw = readFileSync(events, "utf8");
      const state = summarize(raw.trim().split("\n").map(JSON.parse).concat([{ type: "cleanup", status: "pass" }, { type: "end", status: "fail" }]));
      assert.equal(state.counts.pass, 1);
      assert.equal(state.counts.fail, 1);
      assert.equal(state.counts.skip, 1);
      assert.match(formatSummary(state), /assertion mismatch/);
      assert.doesNotMatch(raw, /secret-value/);
      assert.match(result.stdout, /broken/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
