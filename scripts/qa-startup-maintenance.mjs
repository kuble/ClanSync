import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";

export function maintainQaWorkspace(port, { run = spawnSync, log = console.log, warn = console.warn } = {}) {
  try {
    const result = run("pwsh", ["-NoProfile", "-File", fileURLToPath(new URL("./clean-local-artifacts.ps1", import.meta.url)), "-Apply", "-OnDevelopmentStart", "-QaPort", String(port)], { encoding: "utf8", windowsHide: true });
    if (result.error || result.status !== 0) throw new Error("cleanup could not verify safe targets");
    const status = JSON.parse(result.stdout);
    if (!Array.isArray(status.Deleted) || typeof status.QaServerRunning !== "boolean" || typeof status.QaPortOccupied !== "boolean") throw new Error("invalid cleanup result");
    log(`Local cleanup: ${status.Deleted.length} folders removed${status.SkippedReason ? `; skipped: ${status.SkippedReason}` : ""}.`);
    return status;
  } catch {
    warn("Automatic cleanup skipped; existing servers, settings and backups are preserved.");
    return null;
  }
}

export function qaPortIsListening(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: "127.0.0.1", port: Number(port) });
    const finish = listening => { socket.destroy(); resolve(listening); };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}
