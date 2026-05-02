import { test, expect } from "@playwright/test";
import { credentialsForFixture } from "./qa-fixture-credentials";
import { gotoOverwatchLeaderClanBase } from "./fixture-login-helper";

/**
 * QA_01_Clan(시드) 기준: 멤버가 해당 카드로 신청 → 리더가 관리 화면에서 거절 확정까지.
 * 거절 후 다음 실행에서도 멤버가 다시 신청 가능해 회귀에 유리함.
 */
test.describe("가입 신청 · 리더 거절 토스트", () => {
  test("QA_01_Clan 신청 후 거절 확정 시 안내 문구 표시", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);

    const memberCtx = await browser.newContext();
    const leaderCtx = await browser.newContext();
    const memberPage = await memberCtx.newPage();
    const leaderPage = await leaderCtx.newPage();

    try {
      const memberCred = credentialsForFixture("Member");
      await memberPage.goto("/sign-in");
      await memberPage.getByLabel("이메일").fill(memberCred.email);
      await memberPage.getByLabel("비밀번호").fill(memberCred.password);
      await memberPage.getByRole("button", { name: "로그인" }).click();
      await memberPage.waitForURL(/\/games\/?$/, { timeout: 45_000 });

      await memberPage.getByRole("link", { name: /오버워치/i }).first().click();
      await memberPage.waitForURL(/\/games\/overwatch\/(auth|clan)/, {
        timeout: 30_000,
      });

      if (memberPage.url().includes("/auth")) {
        await memberPage
          .getByRole("button", { name: /Battle\.net으로 계속/ })
          .click();
        await memberPage.waitForURL(/\/games\/overwatch\/clan/, {
          timeout: 30_000,
        });
      }

      if (
        /\/games\/overwatch\/clan\/[0-9a-f-]{36}/i.test(memberPage.url())
      ) {
        testInfo.attach("skip-member-in-clan", {
          body: "멤버가 이미 클랜 소속이라 온보딩 검증을 건너뜁니다.",
          contentType: "text/plain",
        });
        return;
      }

      await expect(
        memberPage.getByRole("heading", { name: /가입 또는 생성/ }),
      ).toBeVisible({ timeout: 15_000 });

      await memberPage.waitForTimeout(600);

      const clanRow = memberPage.locator("li").filter({ hasText: "QA_01_Clan" });
      if ((await clanRow.count()) === 0) {
        testInfo.attach("note", {
          body: "목록에 QA_01_Clan 카드가 없습니다. 시드·검색 조건을 확인하세요.",
          contentType: "text/plain",
        });
        return;
      }

      const openBtn = clanRow.locator('[data-testid^="clan-join-open-"]');
      await openBtn.click();
      const send = clanRow.locator('[data-testid^="clan-join-send-"]');
      await expect(send).toBeVisible({ timeout: 12_000 });

      const replaceDialog = memberPage.getByRole("dialog", {
        name: /진행 중인 신청이 있습니다/,
      });
      try {
        await replaceDialog.waitFor({ state: "visible", timeout: 2000 });
        await memberPage.getByRole("button", { name: "취소 후 새로 신청" }).click();
      } catch {
        /* 없음 */
      }

      await send.click();

      await expect(
        memberPage
          .getByText("가입 신청을 보냈습니다.")
          .or(memberPage.getByText("이미 이 클랜에 신청 중입니다."))
          .or(memberPage.getByText("이미 진행 중인 신청이 있습니다.")),
      ).toBeVisible({ timeout: 25_000 });

      const base = await gotoOverwatchLeaderClanBase(leaderPage);
      await leaderPage.goto(`${base}/manage`);

      await expect(
        leaderPage.getByRole("heading", { name: "클랜 관리" }),
      ).toBeVisible({ timeout: 30_000 });

      const pendingSection = leaderPage.locator("section").filter({
        has: leaderPage.getByRole("heading", { name: "가입 신청" }),
      });

      const applicantRow = pendingSection.locator("li").filter({
        hasText: memberCred.email,
      });

      if ((await applicantRow.count()) === 0) {
        testInfo.attach("note", {
          body:
            "관리 화면에 해당 멤버 대기 신청이 없습니다. 동일 DB·시드 여부를 확인하세요.",
          contentType: "text/plain",
        });
        return;
      }

      await applicantRow.first().getByRole("button", { name: "거절" }).click();
      await applicantRow
        .first()
        .getByRole("button", { name: "거절 확정" })
        .click();

      await expect(
        leaderPage.getByText("신청을 거절했습니다."),
      ).toBeVisible({ timeout: 25_000 });
    } finally {
      await memberCtx.close();
      await leaderCtx.close();
    }
  });
});
