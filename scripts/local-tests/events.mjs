import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { redact } from "./runtime.mjs";
export function emit(event) {
  const path = process.env.CLANSYNC_TEST_EVENTS;
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify({ ...event, at: new Date().toISOString(), error: event.error ? redact(event.error).slice(0,6000) : undefined }) + "\n");
}
