import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { clanBannerUrl, DEFAULT_CLAN_BANNER_SELECTION, NORMAL_CLAN_BANNERS, readClanBannerSelection, readClanBannerUrl, sameClanBannerPattern } from "@/lib/clan/banner-catalog";
import { COSMETIC_COLOR_PRESETS } from "@/lib/cosmetics/color-presets";

test.use({ hasTouch: true });

test("배너 URL은 패턴과 색상을 복원하며 잘못된 색상·중복 쿼리를 거절한다", () => {
  for (const design of NORMAL_CLAN_BANNERS) for (const palette of COSMETIC_COLOR_PRESETS) {
    const selection = { designId: design.id, paletteId: palette.id };
    expect(readClanBannerUrl(clanBannerUrl(selection))).toEqual(selection);
    expect(sameClanBannerPattern(clanBannerUrl(selection), design.maskUrl)).toBe(true);
  }
  const url = NORMAL_CLAN_BANNERS[0].maskUrl;
  for (const invalid of [url + "?palette=bad", url + "?palette=rose&palette=blue", url + "?palette=rose?extra=1", url + "?redirect=1", "https://evil.example" + url, null]) expect(readClanBannerUrl(invalid)).toBeNull();
  expect(sameClanBannerPattern(url, NORMAL_CLAN_BANNERS[1].maskUrl)).toBe(false);
});

test("배너 선택은 등록된 패턴·색상 쌍만 허용하고 마스크와 대비를 유지한다", async () => {
  expect(NORMAL_CLAN_BANNERS).toHaveLength(10);
  expect(COSMETIC_COLOR_PRESETS).toHaveLength(6);
  expect(new Set(NORMAL_CLAN_BANNERS.map(item => item.id)).size).toBe(10);
  for (const invalid of [null, [], "blue", {}, { designId: "graphite-hairline" }, { designId: "unknown", paletteId: "blue" }, { designId: "graphite-hairline", paletteId: "#fff" }, { designId: ["graphite-hairline"], paletteId: "blue" }, { designId: "url(javascript:alert(1))", paletteId: "blue" }]) {
    expect(readClanBannerSelection(invalid)).toBeNull();
  }
  let bytes = 0;
  for (const design of NORMAL_CLAN_BANNERS) {
    expect(design.rarity).toBe("normal");
    const svg = readFileSync("public" + design.maskUrl);
    bytes += svg.length;
    expect(svg.toString()).not.toMatch(/<(?:script|image|foreignObject)\b|(?:href|onload)=/i);
    const { channels } = await sharp(svg).stats();
    expect(channels[3].min).toBe(0);
    expect(channels[3].max).toBeGreaterThan(0);
    for (const palette of COSMETIC_COLOR_PRESETS) {
      const pair = { designId: design.id, paletteId: palette.id };
      expect(readClanBannerSelection(pair)).toEqual(pair);
    }
  }
  expect(bytes).toBeLessThan(10_000);
  for (const palette of COSMETIC_COLOR_PRESETS) {
    for (const color of [palette.background, palette.pattern]) {
      const rgb = color.slice(1).match(/../g)!.map(hex => parseInt(hex, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      expect(1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("클랜 배너 스튜디오는 개발 환경에서만 열린다", async ({ request }) => {
  const response = await request.get("/dev/clan-banners");
  expect(response.status()).toBe(process.env.CI ? 404 : 200);
  if (process.env.CI) expect(await response.text()).not.toContain("노말 10종 · 색상 6종");
});

test("색상은 추가 이미지 요청·영역 교체 없이 변경하고 10개 패턴에서 재사용한다", async ({ page }) => {
  test.skip(!!process.env.CI, "개발 전용 화면은 프로덕션 빌드에서 404다.");
  const masks: string[] = [];
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on("request", request => {
    if (request.url().includes("/clan-banners/normal-v1/")) masks.push(request.url());
    if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url());
  });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/dev/clan-banners");
  await page.waitForLoadState("networkidle");
  expect(new Set(masks).size).toBe(10);
  const requested = masks.length;
  const preview = page.getByLabel("클랜 배너 미리보기", { exact: true });
  const artwork = preview.locator("[data-banner-design]");
  await artwork.evaluate(element => element.setAttribute("data-stable-node", "yes"));
  const before = await preview.boundingBox();
  const mask = await artwork.locator("span").evaluate(element => getComputedStyle(element).maskImage);
  for (const palette of COSMETIC_COLOR_PRESETS) {
    await page.getByRole("radio", { name: palette.name, exact: true }).check();
    await expect(artwork).toHaveAttribute("data-banner-palette", palette.id);
    await expect(artwork).toHaveAttribute("data-stable-node", "yes");
    expect(await artwork.locator("span").evaluate(element => getComputedStyle(element).maskImage)).toBe(mask);
    expect(await artwork.evaluate(element => element.style.getPropertyValue("--banner-background"))).toBe(palette.background);
    expect(await preview.boundingBox()).toEqual(before);
  }
  const catalog = page.getByRole("region", { name: "노말 패턴 선택" });
  for (const design of NORMAL_CLAN_BANNERS) {
    await catalog.getByRole("button", { name: design.name, exact: true }).click();
    await expect(artwork).toHaveAttribute("data-banner-design", design.id);
    await expect(artwork).toHaveAttribute("data-banner-palette", "amber");
  }
  expect(masks).toHaveLength(requested);
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
  await catalog.getByRole("button", { name: "사선", exact: true }).click();
  await page.getByRole("radio", { name: "퍼플", exact: true }).check();
  await page.screenshot({ path: test.info().outputPath("banner-studio-desktop.png"), fullPage: true });
});

test("색상 키보드·터치 선택과 주소 복원·잘못된 선택의 기본값을 지원한다", async ({ page }) => {
  test.skip(!!process.env.CI, "개발 전용 화면은 프로덕션 빌드에서 404다.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/clan-banners?design=teal-ripple&palette=purple");
  const artwork = page.getByLabel("클랜 배너 미리보기", { exact: true }).locator("[data-banner-design]");
  await expect(artwork).toHaveAttribute("data-banner-design", "teal-ripple");
  await expect(page.getByRole("radio", { name: "퍼플", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "퍼플", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "로즈", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "그린", exact: true }).tap();
  await page.reload();
  await expect(artwork).toHaveAttribute("data-banner-palette", "green");
  await expect(artwork).toHaveAttribute("data-banner-design", "teal-ripple");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("banner-studio-mobile.png"), fullPage: true });
  for (const query of ["design=bad&palette=purple", "design=graphite-hairline&design=olive-weave&palette=blue"]) {
    await page.goto("/dev/clan-banners?" + query);
    await expect(artwork).toHaveAttribute("data-banner-design", DEFAULT_CLAN_BANNER_SELECTION.designId);
    await expect(artwork).toHaveAttribute("data-banner-palette", DEFAULT_CLAN_BANNER_SELECTION.paletteId);
  }
});
