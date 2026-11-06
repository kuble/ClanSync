import assert from "node:assert/strict";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { chromium } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { loadSharedQaEnv } from "./test-env.mjs";
import { qaFixtureEmail, FIXTURE_PASSWORD, QA_SEED_CLANS } from "./fixtures/qa-fixtures.mjs";
import { MANAGE_SECTIONS } from "../src/lib/clan/manage-sections.ts";

// 시드·게임/금액 변경 없이 기존 QA 화면 진입을 측정한다. 로그인은 이 브라우저 안에서만 사용한다.
// 홍보 화면의 기존 초대 링크 자동 발급 등 진입 시 부수 효과는 실제 화면과 동일하다.
const label = process.argv[2] ?? "latest";
assert.match(label, /^[a-z0-9-]{1,50}$/);
const rounds = Number(process.env.PAGE_MEASURE_RUNS ?? 2);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 3);
const origin = "http://localhost:3011";
const output = resolve(".local-tests/performance", `${label}.json`);
const files = [];
function inventory(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) inventory(path);
    else if (entry.name === "page.tsx") files.push(relative(resolve("src/app"), path).replaceAll("\\", "/"));
  }
}
inventory(resolve("src/app"));
const env = loadSharedQaEnv(), jar = new Map();
const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...jar.values()], setAll: items => items.forEach(item => jar.set(item.name, item)) },
});
const result = { label, origin, startedAt: new Date().toISOString(), sourcePages: files, rows: [] };
const only = process.env.PAGE_MEASURE_ONLY;
if (only) result.only = only;
mkdirSync(resolve(".local-tests/performance"), { recursive: true });
const save = () => writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
let browser;
try {
  const login = await client.auth.signInWithPassword({ email: qaFixtureEmail("Leader", "01"), password: FIXTURE_PASSWORD });
  if (login.error) throw new Error("QA 로그인 실패");
  const userId = login.data.user.id;
  const clanResult = await client.from("clans").select("id").eq("name", QA_SEED_CLANS[0].name).single();
  if (clanResult.error) throw new Error("기존 QA 클랜 조회 실패");
  const clanId = clanResult.data.id, base = `/games/overwatch/clan/${clanId}`;
  const [posts, notices, rooms, peers] = await Promise.all([
    client.from("clan_board_posts").select("id,kind").eq("clan_id", clanId).order("created_at", { ascending: false }).limit(100),
    client.from("clan_notices").select("id").eq("clan_id", clanId).limit(1),
    client.from("balance_rooms").select("id").eq("clan_id", clanId).eq("status", "open").order("created_at", { ascending: false }).limit(1),
    client.from("clan_members").select("user_id").eq("clan_id", clanId).eq("status", "active").neq("user_id", userId).limit(1),
  ]);
  for (const query of [posts, notices, rooms, peers]) assert.equal(query.error, null);
  const zero = "00000000-0000-4000-8000-000000000000", peerId = peers.data[0]?.user_id ?? userId;
  const cases = [];
  const add = (name, path, file, state = "existing") => cases.push({ name, path, file, state });
  for (const file of files) {
    const template = "/" + file.replace(/(?:^|\/)page\.tsx$/, "");
    let path = template.replaceAll("[gameSlug]", "overwatch").replaceAll("[clanId]", clanId)
      .replaceAll("[userId]", peerId).replaceAll("[token]", zero).replaceAll("[section]", "free");
    const post = posts.data.find(row => row.kind === "free");
    path = path.replaceAll("[postId]", template.includes("/clan/") ? post?.id ?? zero : zero);
    assert.ok(!path.includes("["), `파라미터 미분류: ${file}`);
    const state = template.endsWith("/discord") ? "external-action" : template.includes("[token]") ? "expired-token" : template.includes("[postId]") && (!template.includes("/clan/") || !post) ? "missing-sample" : "existing";
    add(template, path || "/", file, state);
  }
  for (const section of MANAGE_SECTIONS) add(`관리:${section.key}`, `${base}/manage?tab=${section.key}`, "games/[gameSlug]/clan/[clanId]/manage/page.tsx");
  for (const section of ["notices", "feedback", "channels", "memories"]) {
    add(`게시판:${section}`, `${base}/board/${section}`, "games/[gameSlug]/clan/[clanId]/board/[section]/page.tsx");
    const post = section === "notices" ? notices.data[0] : posts.data.find(row => row.kind === section);
    if (post) add(`글 상세:${section}`, `${base}/board/${section}/${post.id}`, "games/[gameSlug]/clan/[clanId]/board/[section]/[postId]/page.tsx");
  }
  if (rooms.data[0]) add("진행 중 내전", `${base}/balance?room=${rooms.data[0].id}`, "games/[gameSlug]/clan/[clanId]/balance/page.tsx");
  add("게임 ID 재등록", "/games/overwatch/auth?reauth=1", "games/[gameSlug]/auth/page.tsx");
  add("프로필 계정", "/profile?tab=account", "profile/page.tsx");
  assert.ok(files.every(file => cases.some(item => item.file === file)));
  result.cases = cases.map(item => ({ name: item.name, file: item.file, state: item.state }));
  save();
  browser = await chromium.launch();
  const signed = await browser.newContext({ viewport: { width: 1304, height: 884 } });
  const publicContext = await browser.newContext({ viewport: { width: 1304, height: 884 } });
  await signed.addCookies([...jar.values()].map(cookie => ({ name: cookie.name, value: cookie.value, url: origin, sameSite: "Lax" })));
  for (const context of [signed, publicContext]) await context.addInitScript(() => {
    window.__pageMeasureTasks = [];
    new PerformanceObserver(list => window.__pageMeasureTasks.push(...list.getEntries().map(task => task.duration))).observe({ type: "longtask", buffered: true });
  });
  const selected = only ? cases.filter(item => item.name === only) : cases;
  assert.ok(selected.length > 0, "측정할 화면 이름을 확인하십시오.");
  for (let run = 1; run <= rounds; run++) for (const item of selected) {
    if (item.state === "external-action") {
      result.rows.push({ run, name: item.name, state: item.state, skipped: "외부 초대 발급 경로는 구현만 확인" }); save(); continue;
    }
    const anonymous = ["/", "/sign-in", "/sign-up", "/notices", "/privacy", "/terms", "/contact"].includes(item.path) || item.path.startsWith("/dev/");
    const page = await (anonymous ? publicContext : signed).newPage();
    const started = performance.now();
    let row;
    try {
      const response = await page.goto(origin + item.path, { waitUntil: "commit", timeout: 60_000 });
      if (["/games/overwatch", "/games/overwatch/auth", "/games/overwatch/clan"].includes(item.path))
        await page.waitForURL(origin + base, { waitUntil: "load" });
      const early = {};
      if (item.name === "진행 중 내전") {
        const panel = page.getByTestId("clan-balance-session-panel");
        await panel.waitFor({ state: "visible", timeout: 30_000 });
        early.panelReadyMs = Math.round(performance.now() - started);
        early.initialScoreState = await panel.getAttribute("data-score-state");
        const picker = page.getByRole("dialog", { name: "맵 유형 선택", exact: true });
        if (await picker.count()) {
          await picker.waitFor({ state: "visible" });
          early.mapTypeReadyMs = Math.round(performance.now() - started);
          await picker.getByRole("button", { name: "닫기", exact: true }).click();
          await picker.waitFor({ state: "hidden" });
          const clicked = performance.now();
          await page.getByRole("button", { name: "맵 유형 선택", exact: true }).click();
          await picker.waitFor({ state: "visible" });
          early.earlyMapTypeOpenMs = Math.round(performance.now() - clicked);
          early.scoreStateAtInteraction = await panel.getAttribute("data-score-state");
        }
      }
      if (item.name === "관리:notices") await page.waitForURL(origin + base + "/board/notices", { waitUntil: "load" });
      await page.waitForLoadState("load");
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      const metrics = await page.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0];
        const scripts = performance.getEntriesByType("resource").filter(entry => entry.initiatorType === "script");
        return { ttfbMs: Math.round(n.responseStart - n.requestStart), bodyMs: Math.round(n.responseEnd), loadMs: Math.round(n.loadEventEnd),
          documentKiB: Math.round(n.decodedBodySize / 1024), scriptKiB: Math.round(scripts.reduce((sum, s) => sum + s.decodedBodySize, 0) / 1024),
          scriptCount: scripts.length, longTaskMs: Math.round(window.__pageMeasureTasks.reduce((sum, value) => sum + value, 0)),
          longestTaskMs: Math.round(Math.max(0, ...window.__pageMeasureTasks)), domNodes: document.querySelectorAll("*").length };
      });
      row = { run, name: item.name, state: item.state, role: anonymous ? "anonymous" : "leader", status: response.status(), redirected: page.url() !== origin + item.path, ...early, ...metrics, elapsedMs: Math.round(performance.now() - started) };
      if (item.name === "진행 중 내전" && await page.getByRole("dialog", { name: "맵 유형 선택", exact: true }).isVisible()) {
        const dialog = page.getByRole("dialog", { name: "맵 유형 선택", exact: true });
        await dialog.getByRole("button", { name: "닫기", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });
        const opened = performance.now();
        await page.getByRole("button", { name: "맵 유형 선택", exact: true }).click();
        await dialog.waitFor({ state: "visible" });
        row.mapTypeOpenMs = Math.round(performance.now() - opened);
      }
    } catch (error) { row = { run, name: item.name, state: item.state, error: error.message.split("\n")[0].replace(origin, ""), elapsedMs: Math.round(performance.now() - started) }; }
    finally { await page.close(); }
    result.rows.push(row); save(); console.log(JSON.stringify(row));
  }
  result.endedAt = new Date().toISOString(); save();
} finally {
  await browser?.close();
  await client.auth.signOut({ scope: "local" });
}
