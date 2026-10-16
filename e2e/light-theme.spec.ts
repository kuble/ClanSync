import { expect, test, type Locator, type Page } from "@playwright/test";
import { createAndEnterBalanceRoom, createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

test.use({ actionTimeout: 20_000 });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("clansync-theme", "light"));
});

async function fits(page: Page) {
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "라이트 테마", exact: true })).toBeInViewport();
}

async function dialogFits(page: Page, dialog: Locator, image: string) {
  await expect(dialog).toBeVisible();
  await expect.poll(async () => dialog.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
  const box = (await dialog.boundingBox())!, viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  const overflow = await dialog.locator(".board-scroll, form > fieldset, [data-testid=balance-settings-panel]").evaluateAll(els => els
    .filter(el => (el as HTMLElement).offsetWidth > 0 && el.scrollWidth > el.clientWidth + 1)
    .map(el => ({ tag: el.tagName, width: el.clientWidth, scroll: el.scrollWidth, text: el.textContent?.slice(0, 70) })));
  expect(overflow).toEqual([]);
  await page.screenshot({ path: test.info().outputPath(image), animations: "disabled", caret: "initial" });
}

function luminance(hex: string) {
  const rgb = hex.replace("#", "").match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}

test("light entry pages and theme preference stay readable and fit narrow screens", async ({ page, context }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  context.on("page", p => p.on("console", message => { if (message.type() === "error") errors.push(message.text()); }));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const width of [1304, 390, 320]) {
    await page.setViewportSize({ width, height: 568 });
    for (const path of ["/", "/sign-in", "/sign-up", "/participant-link/invalid"]) {
      await page.goto(path);
      await fits(page);
      if (path === "/sign-in" && width === 320) {
        const remember = page.getByRole("switch", { name: "자동 로그인", exact: true });
        await remember.check();
        expect(await remember.evaluate(el => new FormData((el as HTMLInputElement).form!).get("remember"))).toBe("on");
        await remember.uncheck();
      }
      if (width === 320) await page.screenshot({ path: test.info().outputPath(`entry-${path.replaceAll("/", "") || "home"}.png`), animations: "disabled", caret: "initial" });
    }
  }
  const colors = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return Object.fromEntries(["primary", "muted-foreground", "destructive", "info", "warning", "team-blue", "team-red", "pro-gold", "input", "background", "surface", "card", "muted"].map(k => [k, s.getPropertyValue(`--${k}`).trim()]));
  });
  for (const token of ["primary", "muted-foreground", "destructive", "info", "warning", "team-blue", "team-red", "pro-gold"]) {
    for (const surface of ["background", "surface", "card", "muted"]) {
      const [a, b] = [luminance(colors[token]), luminance(colors[surface])].sort((a, b) => b - a);
      expect((a + .05) / (b + .05), `${token} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const surface of ["background", "surface", "card", "muted"]) {
    expect((luminance(colors[surface]) + .05) / (luminance(colors.input) + .05), `input border on ${surface}`).toBeGreaterThanOrEqual(3);
  }
  // A separate page without an init script verifies persistence rather than forcing it on reload.
  const saved = await context.newPage();
  try {
    await saved.goto("/");
    await saved.getByRole("button", { name: "라이트 테마", exact: true }).click();
    await expect(saved.locator("html")).toHaveClass(/\bdark\b/);
    await saved.reload();
    await expect(saved.locator("html")).toHaveClass(/\bdark\b/);
    await saved.getByRole("button", { name: "라이트 테마", exact: true }).click();
    await saved.reload();
    await expect(saved.locator("html")).toHaveClass(/\blight\b/);
    await saved.evaluate(() => localStorage.removeItem("clansync-theme"));
    await saved.reload();
    await expect(saved.locator("html")).toHaveClass(/\bdark\b/);
  } finally { await saved.close(); }
  expect(errors).toEqual([]);
});

test("light desktop routes, account onboarding and the bannerless clan hero fit mobile", async ({ page }) => {
  test.setTimeout(360_000);
  const f = await createIsolatedBalanceFixture(2), base = f.path.replace(/\/balance$/, "");
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1304, height: 884 });
    const paths = ["/games", "/profile", ...["home", "promo", "lfg", "rank", "scrim"].map(tab => `/games/overwatch?tab=${tab}`),
      base, `${base}/balance`, `${base}/stats`, `${base}/events`, `${base}/store`, `${base}/badges`, `${base}/board`,
      ...["overview", "appearance", "members", "requests", "balance", "notifications", "insights", "subscription"].map(tab => `${base}/manage?tab=${tab}`),
      ...["notices", "free", "feedback", "channels", "memories"].map(section => `${base}/board/${section}`)];
    for (const path of paths) {
      expect((await page.goto(path))!.status()).toBeLessThan(400);
      await fits(page);
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 568 });
      for (const path of [base, `${base}/welcome`, "/games", "/profile", "/games/overwatch/auth?reauth=1", "/participant-link/00000000-0000-0000-0000-000000000000"]) {
        await page.goto(path);
        await fits(page);
      }
      await page.goto(base);
      const hero = page.getByRole("region", { name: "클랜 소개", exact: true });
      await expect(hero.getByRole("heading", { name: `BalanceUI-`, exact: false })).toBeVisible();
      expect(await hero.locator("h1").evaluate(el => getComputedStyle(el).color)).toBe(await page.locator("body").evaluate(el => getComputedStyle(el).color));
      await page.screenshot({ path: test.info().outputPath(`dashboard-${width}.png`), animations: "disabled", caret: "initial" });
    }
    await page.goto(`${base}/board/free`);
    await page.getByRole("button", { name: "글 작성", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "글 작성", exact: true });
    const title = "라이트 게시글 상세";
    await editor.getByLabel("제목", { exact: true }).fill(title);
    await editor.getByLabel("본문", { exact: true }).fill("LongUnbrokenContent".repeat(30));
    await editor.getByRole("button", { name: "저장", exact: true }).click();
    await expect(editor).toBeHidden();
    await page.getByText(title, { exact: true }).click();
    await page.waitForURL(/\/board\/free\/[^/]+$/);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await fits(page);
    await page.screenshot({ path: test.info().outputPath("board-detail-mobile.png"), animations: "disabled", caret: "initial" });
    expect((await f.service.from("clan_members").delete().eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    await page.context().clearCookies();
    await loginIsolatedBalanceUser(page, f.users[1]);
    for (const width of [1304, 390, 320]) {
      await page.setViewportSize({ width, height: 568 });
      await page.goto("/games/overwatch/clan");
      await fits(page);
      await page.getByRole("tab", { name: "클랜 생성", exact: true }).click();
      await fits(page);
      if (width === 320) await page.screenshot({ path: test.info().outputPath("clan-create-mobile.png"), animations: "disabled", caret: "initial" });
    }
  } finally { await f.cleanup(); }
});

test("light stats, reservation and live match settings stay within 320px and 390px", async ({ page }) => {
  test.setTimeout(240_000);
  const f = await createIsolatedBalanceFixture(1), base = f.path.replace(/\/balance$/, "");
  try {
    await loginIsolatedBalanceUser(page, f.users[0]);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 568 });
      await page.goto(`${base}/stats`);
      for (const [tab, title] of [["명예의 전당", "명예의 전당 설정"], ["내전 통계", "내전 통계 설정"], ["경기 기록", "경기 기록 설정"], ["개인 기록", "개인 기록 설정"]]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await page.getByRole("button", { name: title, exact: true }).click();
        const dialog = page.getByRole("dialog", { name: title, exact: true });
        await dialogFits(page, dialog, `${title}-${width}.png`);
        await dialog.getByRole("button", { name: "취소", exact: true }).click();
        await expect(dialog).toBeHidden();
      }
      await page.goto(f.path);
      await page.getByRole("button", { name: "내전 만들기", exact: true }).click();
      const create = page.getByRole("dialog", { name: "내전 만들기", exact: true });
      await create.getByRole("radio", { name: "깜짝 내전", exact: true }).check();
      await create.getByRole("radio", { name: "예약", exact: true }).check();
      await create.getByRole("switch", { name: "참석 투표 자동 개설", exact: true }).check();
      await dialogFits(page, create, `room-create-${width}.png`);
      await create.getByRole("button", { name: "닫기", exact: true }).click();
      await expect(create).toBeHidden();
    }
    await page.setViewportSize({ width: 1304, height: 884 });
    await createAndEnterBalanceRoom(page, f.path, "라이트 테마 경기 설정");
    for (const width of [1304, 390, 320]) {
      await page.setViewportSize({ width, height: 568 });
      await page.getByRole("button", { name: "경기 설정", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "경기 설정", exact: true });
      for (const tab of ["편성", "화면 표시", "경기 구성"]) {
        await dialog.getByRole("tab", { name: tab, exact: true }).click();
        await dialogFits(page, dialog, `match-settings-${tab}-${width}.png`);
      }
      await dialog.getByRole("button", { name: "닫기", exact: true }).click();
      await expect(dialog).toBeHidden();
    }
  } finally { await f.cleanup(); }
});
