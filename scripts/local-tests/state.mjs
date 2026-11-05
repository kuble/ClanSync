import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { workdir, redact } from "./runtime.mjs";

export function summarize(events, metadata = {}) {
  const tests = new Map();
  const result = { ...metadata, phase: "검사 대기", status: "running", total: null, cleanup: null, errors: [] };
  for (const event of events) {
    if (event.type === "phase") { result.phase = event.title; result.currentFile = null; }
    if (event.type === "planned") result.total = event.total;
    if (event.type === "file") result.currentFile = event.status === "start" ? event.title : null;
    if (event.type === "test") {
      tests.set(event.id, { ...tests.get(event.id), ...event, error: event.error ? redact(event.error) : undefined });
      if (event.status === "start") result.currentFile = event.file || result.currentFile;
    }
    if (event.type === "cleanup") result.cleanup = event;
    if (event.type === "error") result.errors.push(redact(event.error));
    if (event.type === "end") { result.status = event.status; result.endedAt = event.at; result.phase = event.status === "pass" ? "검사 완료" : "확인할 문제가 있습니다"; }
  }
  result.tests = [...tests.values()];
  result.counts = Object.fromEntries(["pass","fail","skip","start"].map(status => [status,result.tests.filter(t=>t.status===status).length]));
  return result;
}
export function readRun(id) {
  if (!/^[\w-]+$/.test(id)) throw new Error("잘못된 실행 ID");
  const dir = resolve(workdir,"runs",id);
  const metadata = JSON.parse(readFileSync(resolve(dir,"meta.json"),"utf8"));
  const path = resolve(dir,"events.jsonl");
  const events = existsSync(path) ? readFileSync(path,"utf8").split("\n").flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}}) : [];
  return summarize(events,metadata);
}
export function readState() {
  const runsDir = resolve(workdir,"runs");
  if (!existsSync(runsDir)) return { current: null, history: [] };
  const runs = readdirSync(runsDir).filter(id=>/^[\w-]+$/.test(id)).sort().reverse().slice(0,20).flatMap(id=>{try{return [readRun(id)];}catch{return [];}});
  const current = runs[0] || null;
  if (current?.status === "running") {
    try { process.kill(current.pid,0); } catch (error) {
      if(error.code === "ESRCH") { current.status="interrupted"; current.phase="검사가 예기치 않게 종료됐습니다"; }
    }
  }
  return { current, history: runs.map(({id, mode, status, counts, startedAt, endedAt})=>({id, mode, status, counts, startedAt, endedAt})) };
}
