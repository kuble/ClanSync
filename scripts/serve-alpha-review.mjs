import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const directory = new URL("../docs/03-analysis/alpha-review-2026-10-16/", import.meta.url);
const files = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/README.md", ["README.md", "text/plain"]],
  ["/verification.md", ["verification.md", "text/plain"]],
  ["/measurements.json", ["measurements.json", "application/json"]],
  ["/economics.mjs", ["economics.mjs", "text/javascript"]],
]);
function asset(url) {
  try { return files.get(new URL(url, "http://localhost").pathname); }
  catch { return undefined; }
}
if (process.argv.includes("--self-test")) {
  assert.equal(asset("/"), files.get("/"));
  for (const url of ["/.env.local", "/../.env.local", "/%2e%2e/.env.local", "/README.md/other", "/src/app/page.tsx"])
    assert.equal(asset(url), undefined);
  console.log("Report server allowlist checks passed");
} else {
  const server = createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    const selected = asset(request.url);
    if (!selected) { response.writeHead(404); response.end(); return; }
    try {
      const body = await readFile(fileURLToPath(new URL(selected[0], directory)));
      response.writeHead(200, {
        "Content-Type": `${selected[1]}; charset=utf-8`, "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch { response.writeHead(500); response.end("Report file unavailable"); }
  });
  server.listen(3040, "127.0.0.1", () => console.log("Alpha review: http://127.0.0.1:3040/ (loopback only; Ctrl+C to stop)"));
  server.on("error", (error) => { console.error(error.code ?? "Report server error"); process.exitCode = 1; });
}
