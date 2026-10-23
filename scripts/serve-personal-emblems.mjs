import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { awards, milestones, metals } from "../public/personal-emblems/v1/catalog.mjs";

const directory = new URL("../public/personal-emblems/v1/", import.meta.url);
const files = new Map([["/", ["review.html", "text/html"]], ...[
  ["review.html", "text/html"], ["review.mjs", "text/javascript"], ["catalog.mjs", "text/javascript"],
].map(([file, type]) => ["/" + file, [file, type]])]);
for (const period of ["month", "year"]) for (const award of awards) for (const metal of metals) {
  const file = "awards/" + period + "/" + award.id + "-" + metal + ".png";
  files.set("/" + file, [file, "image/png"]);
}
for (const series of milestones) for (let stage = 1; stage <= 4; stage++) {
  const file = "milestones/" + series.id + "-" + stage + ".png";
  files.set("/" + file, [file, "image/png"]);
}
function asset(url) {
  try { return files.get(new URL(url, "http://localhost").pathname); } catch { return undefined; }
}
if (process.argv.includes("--self-test")) {
  assert.equal(files.size, 54);
  assert.equal(asset("/"), files.get("/"));
  for (const url of ["/.env.local", "/../.env.local", "/%2e%2e/.env.local", "/src/app/page.tsx", "/awards/month/unknown.png"])
    assert.equal(asset(url), undefined);
  console.log("Emblem review server: allowlist passed");
} else {
  const server = createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    const selected = asset(request.url);
    if (!selected) { response.writeHead(404); response.end(); return; }
    try {
      const body = await readFile(new URL(selected[0], directory));
      response.writeHead(200, {
        "Content-Type": selected[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch { response.writeHead(404); response.end("Image not available"); }
  });
  server.listen(3044, "127.0.0.1", () => console.log("Personal emblems: http://127.0.0.1:3044/"));
  server.on("error", (error) => { console.error(error.code ?? "Review server error"); process.exitCode = 1; });
}
