import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { gotoOverwatchLeaderClanBase } from "./fixture-login-helper";
import { loadTestEnv } from "../scripts/test-env.mjs";

test("officers manage real notices and rules across management and dashboard", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const env = loadTestEnv();
  const svc = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const base = await gotoOverwatchLeaderClanBase(page);
  const clanId = base.split("/").at(-1)!;
  const title = `notice-${Date.now()}`;
  const editedTitle = `${title}-edited`;
  const original = await svc
    .from("clans")
    .select("rules")
    .eq("id", clanId)
    .single();
  expect(original.error).toBeNull();
  let noticeId: string | undefined;
  try {
    await page.goto(`${base}/manage?tab=overview`);
    await page.getByRole("button", { name: "공지 작성", exact: true }).click();
    const editor = page.getByRole("dialog");
    await editor.getByLabel("제목", { exact: true }).fill(title);
    await editor
      .getByLabel("본문", { exact: true })
      .fill("이번 주에도 즐겁게 게임해요.");
    await editor
      .getByRole("checkbox", { name: "대시보드 상단에 고정" })
      .check();
    await editor
      .getByRole("button", { name: "공지 저장", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    const created = await svc
      .from("clan_notices")
      .select("id,is_pinned")
      .eq("clan_id", clanId)
      .eq("title", title)
      .single();
    expect(created.error).toBeNull();
    noticeId = created.data!.id;
    expect(created.data!.is_pinned).toBe(true);
    await page
      .getByRole("button", { name: `${title} 편집`, exact: true })
      .click();
    await editor.getByLabel("제목", { exact: true }).fill(editedTitle);
    await editor
      .getByLabel("본문", { exact: true })
      .fill("모임 시작 10분 전에 접속해 주세요.");
    await editor
      .getByRole("button", { name: "공지 저장", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    const edited = await svc
      .from("clan_notices")
      .select("title,content")
      .eq("id", noticeId!)
      .single();
    expect(edited.error).toBeNull();
    expect(edited.data).toEqual({
      title: editedTitle,
      content: "모임 시작 10분 전에 접속해 주세요.",
    });
    await page
      .getByRole("button", { name: `${editedTitle} 고정 해제`, exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await svc
          .from("clan_notices")
          .select("is_pinned")
          .eq("id", noticeId!)
          .single();
        return result.data?.is_pinned;
      })
      .toBe(false);
    await page
      .getByRole("textbox", { name: "클랜 규칙", exact: true })
      .fill(`${title} 규칙\n서로 존중하며 플레이해요.`);
    await page.getByRole("button", { name: "규칙 저장", exact: true }).click();
    await expect(
      page.getByText("클랜 규칙을 저장했습니다.", { exact: true }),
    ).toBeVisible();

    await page.goto(base);
    await page
      .getByRole("region", { name: "클랜 공지사항", exact: true })
      .getByRole("button", { name: new RegExp(editedTitle) })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByText("모임 시작 10분 전에 접속해 주세요.", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "클랜 규칙 전체 보기", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByText(`${title} 규칙`, { exact: false }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(`${base}/manage?tab=members`);
    await expect(
      page.getByRole("tab", { name: "구성원", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("textbox", { name: "구성원 검색", exact: true })
      .fill(`missing-${title}`);
    await expect(
      page.getByText("조건에 맞는 멤버가 없습니다.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "개요", exact: true }).click();
    await expect(page).toHaveURL(/tab=overview/);
    await page
      .getByRole("button", { name: `${editedTitle} 삭제`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "공지 삭제", exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await svc
          .from("clan_notices")
          .select("id")
          .eq("id", noticeId!);
        return result.data?.length;
      })
      .toBe(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("tab", { name: "구성원", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    const deleteNotice = svc
      .from("clan_notices")
      .delete()
      .eq("clan_id", clanId);
    const cleanup = await Promise.all([
      svc
        .from("clans")
        .update({ rules: original.data!.rules })
        .eq("id", clanId),
      noticeId
        ? deleteNotice.eq("id", noticeId)
        : deleteNotice.in("title", [title, editedTitle]),
    ]);
    for (const result of cleanup) expect(result.error).toBeNull();
  }
});
