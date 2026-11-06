import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import ts from "typescript";
import { defineConfig } from "@playwright/test";

test("로직 설정은 DB 환경 로더·서버·시드·브라우저 설정을 상속하지 않는다", () => {
  const file = resolve("playwright.unit.config.ts");
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const unitModule = { exports: {} };
  vm.runInNewContext(source, { module: unitModule, exports: unitModule.exports, require(name) {
    assert.equal(name, "@playwright/test", "로직 설정에서 다른 설정·환경 로더를 가져오면 안 됩니다.");
    return { defineConfig };
  } });
  const config = unitModule.exports.default;
  assert.equal(config.testDir, "./e2e/logic");
  for (const key of ["globalSetup", "globalTeardown", "webServer", "projects"]) assert.equal(config[key], undefined);
  assert.equal(config.forbidOnly, true);
  assert.match(readFileSync("playwright.config.ts", "utf8"), /testIgnore:\s*\["\*\*\/logic\/\*\*"\]/);
  for (const name of readdirSync("e2e/logic").filter(name => name.endsWith(".spec.ts"))) {
    const text = readFileSync(resolve("e2e/logic", name), "utf8");
    assert.doesNotMatch(text, /createIsolatedBalanceFixture|loadTestEnv|test-env\.mjs/, name);
  }
});

test("전체 검증 명령은 로직·DB·프로덕션 E2E와 정적 검사를 빠짐없이 순서대로 실행한다", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  assert.equal(scripts["test:all"], "npm run lint && npx tsc --noEmit && npm run test:unit && npm run test:db && npm run test:e2e");
  assert.equal(scripts["test:unit"], "node --test scripts/local-tests/suites.test.mjs && playwright test --config=playwright.unit.config.ts");
});

test("로직 파일을 E2E 실행기에 넘기면 DB 잠금을 잡기 전에 전용 명령을 안내한다", () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["scripts/local-tests/run.mjs", "e2e", "e2e/logic/formation-rules.spec.ts"], { encoding: "utf8", env, timeout: 10000, windowsHide: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /로직 검사는 npm run test:unit/);
  assert.doesNotMatch(result.stdout, /로컬 DB 준비/);
});
