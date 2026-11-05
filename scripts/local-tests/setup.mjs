import { setup, reset, redact, acquireLock } from "./runtime.mjs";
const resetting = process.argv.includes("--reset");
console.log(resetting ? "전용 로컬 DB를 정리합니다." : "전용 로컬 DB를 준비합니다. 기존 QA DB는 연결하지 않습니다.");
const release = acquireLock();
try {
  const log = text => { if (/pull|download|migration|error|failed/i.test(text)) process.stdout.write(redact(text)); };
  if (resetting) console.log(await reset(log));
  else await setup(log);
  console.log(resetting ? "LOCAL_TEST_DB_CLEAN" : "LOCAL_TEST_DB_READY http://127.0.0.1:55431");
} catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
finally { release(); }
