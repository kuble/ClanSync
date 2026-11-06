// Node preload for the test web server only. There is no app route or client switch.
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve, sep } from "node:path";

const file = process.env.CLANSYNC_E2E_DB_FAULT_FILE;
const runRoot = resolve(process.cwd(), ".local-tests", "runs") + sep;
if (process.env.CLANSYNC_E2E === "1" && process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:55431"
  && file && resolve(file).startsWith(runRoot) && basename(file) === "db-fault.json") {
  const original = globalThis.fetch;
  const read = () => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };
  const write = (state) => writeFileSync(file, JSON.stringify(state));
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const state = read();
    if (!state || url.origin !== "http://127.0.0.1:55431") return original(input, init);
    let body;
    try { body = JSON.parse(typeof init?.body === "string" ? init.body : "{}"); } catch { body = {}; }
    const sameClan = body.p_clan_id === state.clanId || url.searchParams.get("id") === `eq.${state.clanId}`;
    if (!sameClan) return original(input, init);
    if (url.pathname === "/rest/v1/rpc/edit_clan_match_record") {
      state.mutationRequests++;
      write(state);
      const response = await original(input, init);
      if (response.ok) {
        write({ ...state, armed: true, writes: state.writes + 1 });
        if (state.mode === "pause") {
          const deadline = Date.now() + 10_000;
          while (!read()?.resume && Date.now() < deadline) await new Promise(r => setTimeout(r, 20));
        }
      }
      return response;
    }
    if (state.armed && url.pathname === `/rest/v1/rpc/${state.target}` && state.remaining > 0) {
      if (state.mode === "delay") {
        write({ ...state, remaining: state.remaining - 1, waiting: true });
        const deadline = Date.now() + 20_000;
        while (!read()?.resume && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
        return original(input, init);
      }
      write({ ...state, remaining: state.remaining - 1, failures: state.failures + 1 });
      console.warn("E2E_READ_FAULT", JSON.stringify({ status: 502, afterCommit: state.writes > 0 }));
      return new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "Content-Type": "text/html" } });
    }
    return original(input, init);
  };
}
