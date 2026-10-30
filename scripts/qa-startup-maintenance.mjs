import { spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export function maintainQaWorkspace(port, { run = spawnSync, log = console.log } = {}) {
  try {
    const result = run("pwsh", ["-NoProfile", "-File", fileURLToPath(new URL("./clean-local-artifacts.ps1", import.meta.url)), "-Apply", "-OnDevelopmentStart", "-QaPort", String(port)], { encoding: "utf8", windowsHide: true });
    if (result.error || result.status !== 0) throw new Error("cleanup could not verify safe targets");
    const status = JSON.parse(result.stdout);
    if (!Array.isArray(status.Deleted) || typeof status.QaServerRunning !== "boolean" || typeof status.QaPortOccupied !== "boolean") throw new Error("invalid cleanup result");
    log(`Local cleanup: ${status.Deleted.length} folders removed${status.SkippedReason ? `; skipped: ${status.SkippedReason}` : ""}.`);
    return status;
  } catch {
    throw new Error("QA startup requires host process/port access. Run npm run dev:qa in a host terminal (Codex: sandbox_permissions=require_escalated). No server was started or stopped.");
  }
}

export async function waitForQaHttp(port, { timeoutMs = 60000 } = {}) {
  const urls = ["localhost", "127.0.0.1"].map(host => `http://${host}:${port}/`);
  const deadline = Date.now() + timeoutMs;
  let failures = urls;
  while (Date.now() < deadline) {
    const results = await Promise.all(urls.map(async url => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))) });
        await response.arrayBuffer();
        return response.ok ? null : `${url} HTTP ${response.status}`;
      } catch {
        return `${url} no HTTP response`;
      }
    }));
    failures = results.filter(Boolean);
    if (!failures.length) return urls;
    await setTimeout(Math.max(0, Math.min(500, deadline - Date.now())));
  }
  throw new Error(`QA HTTP readiness failed: ${failures.join(", ")}. Existing processes were preserved; do not open browser tabs yet.`);
}
