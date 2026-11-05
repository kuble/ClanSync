import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { root, workdir, prepare, setup, reset, run, runtimeEnv, redact, acquireLock } from "./runtime.mjs";
import { loadTestEnv } from "../test-env.mjs";
import { emit } from "./events.mjs";
import { enableDiagnostics, captureDiagnostics, compareDiagnostics } from "./diagnostics.mjs";

const mode = process.argv[2];
if (!["db", "e2e"].includes(mode)) throw new Error("Usage: run.mjs db|e2e [test files]");
const requested = process.argv.slice(3);
for (const file of requested) {
  const clean = file.replace(/:\d+(?::\d+)?$/, "");
  const prefix = mode === "db" ? "scripts/" : "e2e/";
  if (!clean.startsWith(prefix) || clean.includes("..") || !/\.(test\.mjs|spec\.ts)$/.test(clean) || !existsSync(resolve(root,clean)))
    throw new Error(`허용되지 않은 검사 파일 ${file}`);
}
const release = acquireLock();
const id = `${new Date().toISOString().replace(/[:.]/g,"-")}-${randomUUID().slice(0,8)}`;
const dir = resolve(workdir, "runs", id); mkdirSync(dir, { recursive: true });
process.env.CLANSYNC_TEST_EVENTS = resolve(dir, "events.jsonl");
writeFileSync(resolve(dir, "meta.json"), JSON.stringify({ id, mode, files: requested, pid: process.pid, startedAt: new Date().toISOString() }));
const controller = new AbortController();
const abort = () => controller.abort();
process.on("SIGINT", abort); process.on("SIGTERM", abort);
let failed = false, ready = false, before = null;
const phase = title => { console.log(title); emit({ type: "phase", title }); };
try {
  phase("로컬 DB 준비");
  prepare(); await setup(); ready = true;
  phase("이전 검사 데이터 정리"); await reset();
  await enableDiagnostics();
  if (controller.signal.aborted) throw new Error("검사가 중단되었습니다.");
  const devServer = mode === "e2e" && process.env.LOCAL_TEST_DEV_SERVER === "1";
  const env = { ...loadTestEnv(), PATH: runtimeEnv.PATH, CLANSYNC_TEST_EVENTS: process.env.CLANSYNC_TEST_EVENTS,
    CLANSYNC_E2E_DB_FAULT_FILE: resolve(dir, "db-fault.json"), CI: devServer ? "" : "1", E2E_SKIP_SEED: "1", PLAYWRIGHT_DEV_PORT: "3010" };
  if (mode === "e2e") {
    phase("로컬 테스트 계정 준비");
    const seed = await run(process.execPath,["scripts/seed-fixtures.mjs"], {env, signal: controller.signal});
    if (seed.code !== 0) throw new Error(redact(seed.stderr || seed.stdout));
  }
  phase(mode === "db" ? "DB 검사 실행 중" : "브라우저 검사 실행 중");
  before=await captureDiagnostics(dir,'before');
  const files = requested.length ? requested : mode === "db" ? [...new Set(JSON.parse(readFileSync(resolve(root,"package.json"),"utf8")).scripts["test:db:raw"].match(/scripts\/[\w-]+\.test\.mjs/g))] : [];
  const args = mode === "db" ? ["--test", "--test-concurrency=1", "--test-reporter=./scripts/local-tests/node-reporter.mjs", ...files]
    : [fileURLToPath(new URL("../../node_modules/@playwright/test/cli.js",import.meta.url)), "test", ...files, "--workers=1", "--retries=0", "--reporter=./scripts/local-tests/playwright-reporter.mjs,list", `--output=${dir}/artifacts`];
  const result = await run(process.execPath,args,{env, signal: controller.signal, timeout: 3_600_000, onLine: value => { process.stdout.write(value); }});
  failed = result.code !== 0;
  writeFileSync(resolve(dir,"output.log"), redact(result.stdout + result.stderr));
} catch (error) { failed = true; emit({ type: "error", error: error.message }); console.error(redact(error.message)); }
finally {
  if(before) {
    try {
      const after=await captureDiagnostics(dir,'after');
      writeFileSync(resolve(dir,'db-comparison.json'),JSON.stringify(compareDiagnostics(before,after),null,2));
    } catch(error) { emit({type:'diagnostics',status:'fail',error:error.message}); console.error('DB 계측 확인 필요: '+redact(error.message)); }
  }
  if (ready) {
    phase("검사 후 데이터 정리");
    try { emit({ type: "cleanup", status: "pass", counts: await reset() }); }
    catch (error) { failed = true; emit({ type: "cleanup", status: "fail", error: error.message }); }
  } else emit({ type: "cleanup", status: "not-run", error: "로컬 DB 준비에 실패해 정리 여부를 확인하지 못했습니다." });
  emit({ type: "end", status: failed ? "fail" : "pass" });
  release();
  process.removeListener("SIGINT",abort); process.removeListener("SIGTERM",abort);
  process.exitCode = failed ? 1 : 0;
}
