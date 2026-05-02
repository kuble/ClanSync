import type { Page } from "@playwright/test";
import {
  credentialsForFixture,
  type FixtureRolePascal,
} from "./qa-fixture-credentials";

/** 픽스처 계정으로 이메일 로그인 후 `/games`까지 대기 */
export async function loginAsFixtureRole(
  page: Page,
  role: FixtureRolePascal,
): Promise<void> {
  const { email, password } = credentialsForFixture(role);
  await page.goto("/sign-in");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/games\/?$/, { timeout: 45_000 });
}

/** 리더 전용 — 미들웨어가 member 면 .../clan/{uuid} 로 정정 */
export async function gotoOverwatchLeaderClanBase(page: Page): Promise<string> {
  await loginAsFixtureRole(page, "Leader");
  await page.goto("/games/overwatch/clan");
  await page.waitForURL(
    /\/games\/overwatch\/clan\/[0-9a-f-]{36}(\/|$)/i,
    { timeout: 45_000 },
  );
  const url = page.url();
  const m = url.match(/^(.+\/games\/overwatch\/clan\/[0-9a-f-]{36})/i);
  if (!m?.[1]) {
    throw new Error(`클랜 베이스 URL을 파싱하지 못했습니다: ${url}`);
  }
  return m[1];
}
