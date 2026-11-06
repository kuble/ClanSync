import { randomUUID } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";

function faultFile() {
  const file = process.env.CLANSYNC_E2E_DB_FAULT_FILE;
  if (!file || !resolve(file).startsWith(resolve(".local-tests", "runs") + sep) || basename(file) !== "db-fault.json")
    throw new Error("전용 로컬 검사 실행기의 조회 오류 파일이 필요합니다.");
  return file;
}
function state() { return JSON.parse(readFileSync(faultFile(), "utf8")); }

for (const persistent of [false, true]) {
  test(`게시판 이름 조회는 ${persistent ? "연속 502를 두 번으로 제한하고 다시 불러온다" : "일시 502를 한 번 재조회해 표시한다"}`, async ({ page }) => {
    const fixture = await createIsolatedBalanceFixture(1), postId = randomUUID(), title = "이름 조회 복구 확인";
    try {
      expect((await fixture.service.from("clan_board_posts").insert({ id: postId, clan_id: fixture.clanId,
        author_id: fixture.users[0].id, kind: "free", title, content: "저장된 본문" })).error).toBeNull();
      await loginIsolatedBalanceUser(page, fixture.users[0]);
      writeFileSync(faultFile(), JSON.stringify({ clanId: fixture.clanId, target: "clan_peer_nicknames", armed: true,
        remaining: persistent ? 100 : 1, writes: 0, failures: 0 }));
      await page.goto(fixture.path.replace(/\/balance$/, "") + `/board/free/${postId}`);
      if (persistent) {
        await expect(page.getByRole("alert").filter({ hasText: "게시판을 불러오지 못했습니다." })).toBeVisible();
        expect(state()).toMatchObject({ failures: 2, writes: 0 });
        writeFileSync(faultFile(), JSON.stringify({ ...state(), remaining: 0 }));
        await page.getByRole("button", { name: "다시 불러오기", exact: true }).click();
      }
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator("article header")).toContainText(fixture.users[0].nickname);
      expect(state()).toMatchObject({ failures: persistent ? 2 : 1, writes: 0 });
      expect((await fixture.service.from("clan_board_posts").select("content").eq("id", postId).single()).data?.content).toBe("저장된 본문");
    } finally {
      try { unlinkSync(faultFile()); } catch {}
      await fixture.cleanup();
    }
  });
}
