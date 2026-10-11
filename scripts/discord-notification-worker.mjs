// Run on an always-on host, with environment values provided by that host.
const rawUrl = process.env.DISCORD_DISPATCH_URL;
const secret = process.env.CRON_SECRET;
let url;
try { url = new URL(rawUrl ?? ""); } catch { throw new Error("DISCORD_DISPATCH_URL is required"); }
if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
    url.pathname !== "/api/cron/dispatch-notifications" || url.username || url.password || url.search || url.hash) {
  throw new Error("Use the site's HTTPS /api/cron/dispatch-notifications endpoint");
}
if (!secret || secret.length < 8) throw new Error("CRON_SECRET is required");

do {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` }, redirect: "error",
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`Dispatch HTTP ${response.status}`);
    const result = await response.json();
    if (!result.ok || result.discord_note) throw new Error("Dispatch did not complete");
    console.log(new Date().toISOString(), "Discord dispatch", JSON.stringify(result.discord));
  } catch (error) {
    // Do not log URLs, credentials, response bodies or underlying network errors.
    console.error(new Date().toISOString(), error instanceof Error && error.message.startsWith("Dispatch") ? error.message : "Dispatch request failed");
    if (process.argv.includes("--once")) process.exitCode = 1;
  }
  if (process.argv.includes("--once")) break;
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, 60_000 - (Date.now() - started))));
} while (true);
