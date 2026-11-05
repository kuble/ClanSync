import { spawn } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, unlinkSync } from "node:fs";
import { resolve, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { LOCAL_TEST_URL } from "../test-env.mjs";

export const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const workdir = resolve(root, ".local-tests");
export const project = "clansync-automated-tests";
export const container = `supabase_db_${project}`;
export const cli = resolve(root, "node_modules/supabase/bin", process.platform === "win32" ? "supabase.exe" : "supabase");
export const runtimeEnv = { ...process.env, PATH: [process.env.PATH, process.platform === "win32" ? "C:\\Program Files\\Docker\\Docker\\resources\\bin" : ""].join(delimiter), SUPABASE_ACCESS_TOKEN: "", SUPABASE_DB_PASSWORD: "" };

export function acquireLock() {
  mkdirSync(workdir, { recursive: true });
  const lock = resolve(workdir,"run.lock");
  if(existsSync(lock)) {
    const pid=Number(readFileSync(lock,"utf8"));
    if(!Number.isInteger(pid)||pid<1) throw new Error("로컬 검사 잠금 정보를 확인해야 합니다.");
    try { process.kill(pid,0); throw new Error("다른 로컬 검사 또는 정리가 실행 중입니다."); }
    catch(error) { if(error.code!=="ESRCH") throw error; }
    unlinkSync(lock);
  }
  const fd=openSync(lock,"wx");writeFileSync(fd,String(process.pid));closeSync(fd);
  return ()=>{if(existsSync(lock)&&readFileSync(lock,"utf8")===String(process.pid))unlinkSync(lock);};
}

export function redact(value) {
  return String(value).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[인증값 숨김]")
    .replace(/sb_(?:secret|publishable)_[\w-]+/g, "[인증값 숨김]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DB 연결 숨김]")
    .replace(/((?:password|service_role_key|anon_key|jwt_secret|access_token|authorization)\s*[:=]\s*)\S+/gi, "$1[숨김]");
}

export function run(command, args, { env = runtimeEnv, onLine = () => {}, input, timeout = 600_000, signal } = {}) {
  return new Promise((resolveResult, reject) => {
    if (signal?.aborted) return reject(new Error("검사가 중단되었습니다."));
    const child = spawn(command, args, { cwd: root, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    let interrupted = false;
    const terminate = () => {
      interrupted = true;
      if (!child.pid || child.exitCode !== null) return;
      if (process.platform === "win32") spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else child.kill("SIGTERM");
    };
    const timer = setTimeout(terminate, timeout);
    signal?.addEventListener("abort", terminate, { once: true });
    child.stdout.on("data", data => { stdout += data; onLine(redact(data.toString())); });
    child.stderr.on("data", data => { stderr += data; onLine(redact(data.toString())); });
    child.on("error", error => { clearTimeout(timer); signal?.removeEventListener("abort",terminate); reject(error); });
    child.on("close", code => { clearTimeout(timer); signal?.removeEventListener("abort",terminate); resolveResult({ code: interrupted ? 1 : code, stdout, stderr: interrupted ? `${stderr}\n검사가 중단되거나 제한 시간을 초과했습니다.` : stderr }); });
    child.stdin.end(input);
  });
}
export async function checked(command, args, options) {
  const result = await run(command, args, options);
  if (result.code !== 0) throw new Error(redact(result.stderr || result.stdout || `${command} 실행 실패 (${result.code})`).slice(-3000));
  return result.stdout;
}
export function prepare() {
  mkdirSync(resolve(workdir, "supabase"), { recursive: true });
  cpSync(resolve(root, "scripts/local-tests/config.toml"), resolve(workdir, "supabase/config.toml"));
  cpSync(resolve(root, "supabase/migrations"), resolve(workdir, "supabase/migrations"), { recursive: true });
}
export function assertLocalWorkdir() {
  if (workdir !== resolve(root, ".local-tests") || !readFileSync(resolve(workdir, "supabase/config.toml"), "utf8").includes(`project_id = "${project}"`))
    throw new Error("전용 로컬 DB 설정이 일치하지 않아 작업을 중단했습니다.");
  if (existsSync(resolve(workdir, "supabase/.temp/project-ref")))
    throw new Error("원격 연결 정보가 발견되어 로컬 DB 작업을 중단했습니다.");
}
export async function setup(onLine = () => {}) {
  prepare(); assertLocalWorkdir();
  await checked("docker", ["info", "--format", "{{.ServerVersion}}"], { timeout: 30_000 });
  const network = "clansync-local-tests";
  const found = await run("docker", ["network", "inspect", network], { timeout: 15_000 });
  if (found.code !== 0) await checked("docker", ["network", "create", "--opt", "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", network]);
  else if (JSON.parse(found.stdout)[0]?.Options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1")
    throw new Error("로컬 전용 Docker 네트워크 설정이 일치하지 않습니다.");
  await checked(cli, ["start", "--workdir", workdir, "--network-id", network], { onLine, timeout: 1200_000 });
  const status = JSON.parse(await checked(cli, ["status", "--workdir", workdir, "-o", "json"]));
  if (status.API_URL !== LOCAL_TEST_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY)
    throw new Error("로컬 DB 주소 또는 인증 설정이 일치하지 않습니다.");
  // This historical retirement was performed through the Storage API on QA,
  // after its SQL migration. Reproduce that step only in the fresh local stack.
  const storage = createClient(LOCAL_TEST_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
  const bucket = await storage.getBucket("profile-photos");
  if (bucket.data) {
    const removed = await storage.deleteBucket("profile-photos");
    if (removed.error) throw new Error(`로컬 폐기 버킷 정리 실패: ${removed.error.message}`);
  } else if (bucket.error && Number(bucket.error.statusCode) !== 404) throw new Error(`로컬 Storage 확인 실패: ${bucket.error.message}`);
  writeFileSync(resolve(root, ".env.test-local"), [
    `NEXT_PUBLIC_SUPABASE_URL=${LOCAL_TEST_URL}`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`, `CRON_SECRET=${randomBytes(32).toString("hex")}`,
    "NEXT_PUBLIC_SITE_URL=http://localhost:3010", "DEV_GAME_LINK_SIMULATOR=1", "",
  ].join("\n"), { mode: 0o600 });
}
export async function reset(onLine = () => {}) {
  assertLocalWorkdir();
  // Recreate the dedicated stack including Storage files. db reset alone keeps
  // object volumes and may leave gateway DNS pointing at an old DB container.
  await checked(cli, ["stop", "--no-backup", "--workdir", workdir, "--network-id", "clansync-local-tests"], { onLine });
  await setup(onLine);
  const counts = await countData();
  if (counts.accounts || counts.clans || counts.matches) throw new Error("로컬 테스트 데이터 정리 후 잔여 데이터가 있습니다.");
  return counts;
}
export async function countData() {
  assertLocalWorkdir();
  const sql = "select json_build_object('accounts',(select count(*) from auth.users),'clans',(select count(*) from public.clans),'matches',(select count(*) from public.balance_sessions));";
  return JSON.parse((await checked("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-Atc", sql], { timeout: 15000 })).trim());
}
