import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardThumbnail, validateBoardInput } from "../src/lib/clan/board";
import { singleLineText } from "../src/lib/clan/emoji-text";

test("memory captions accept one line while other boards keep multiline content", () => {
  for (const separator of ["\n", "\r\n", "\r", "\u2028", "\u2029"]) {
    expect(singleLineText(`첫 줄 ${separator} 다음 줄`)).toBe("첫 줄 다음 줄");
    expect(validateBoardInput("memories", "사진", `첫 줄${separator}다음 줄`, {})).toBe("글은 한 줄로 입력해 주십시오.");
    expect(validateBoardInput("free", "글", `첫 줄${separator}다음 줄`, {})).toBeNull();
  }
  const token = "[e:00000000-0000-0000-0000-000000000001]";
  expect(singleLineText(`사진\n${token}`)).toBe(`사진 ${token}`);
  expect(validateBoardInput("memories", "사진", "가".repeat(100), {})).toBeNull();
});

test("polaroid captions are edited under the photo and shown once on one line", async ({ page }) => {
  test.setTimeout(150_000); page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(1), svc = f.service, base = f.path.replace(/\/balance$/, "");
  try {
    await loginIsolatedBalanceUser(page, f.users[0]); await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/board/memories"); await page.getByRole("button", { name: "추억 남기기", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "추억 남기기", exact: true }), input = editor.getByRole("textbox", { name: "글", exact: true });
    const buffer = await sharp({ create: { width: 600, height: 450, channels: 4, background: "#8ab99c" } }).png().toBuffer();
    await editor.getByLabel("사진", { exact: true }).setInputFiles({ name: "caption.png", mimeType: "image/png", buffer });
    await expect(input).toHaveAttribute("aria-multiline", "false");
    expect(await input.evaluate(el => !!el.closest("[data-photo-frame]"))).toBe(true);
    await input.fill("첫날"); await input.press("End"); await input.press("Enter"); await input.press("Shift+Enter");
    expect(await input.textContent()).toBe("첫날"); await expect(editor).toBeVisible();
    await input.evaluate(el => { const data = new DataTransfer(); data.setData("text/plain", "\n함께한 순간"); el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data })); });
    expect(await input.textContent()).toBe("첫날 함께한 순간");
    await editor.getByRole("button", { name: "글 이모티콘 선택", exact: true }).click();
    await page.getByRole("button", { name: "하트 이모티콘", exact: true }).click();
    expect(await input.textContent()).toContain("❤️");
    const caption = "함께한 순간 ".repeat(14).slice(0, 100);
    await input.fill(caption); expect(await input.textContent()).toBe(caption);
    const callPromise = page.waitForRequest(req => !!req.headers()["next-action"] && !!req.postData()?.includes(caption));
    await editor.getByRole("button", { name: "저장", exact: true }).click(); const call = await callPromise;
    await expect(page).toHaveURL(/\/memories\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const id = page.url().split("/").at(-1)!;
    const article = page.getByRole("article"), line = article.locator("[data-photo-caption]");
    await expect(line).toHaveCount(1); await expect(line).toHaveText(caption.trim());
    await expect(article.getByRole("heading")).toHaveCount(0);
    const layout = await line.evaluate(el => ({ height: el.clientHeight, width: el.clientWidth, contentWidth: el.scrollWidth, wrap: getComputedStyle(el).whiteSpace, overflow: getComputedStyle(el).textOverflow }));
    expect(layout.height).toBeLessThanOrEqual(32); expect(layout.contentWidth).toBeGreaterThan(layout.width); expect(layout.wrap).toBe("nowrap"); expect(layout.overflow).toBe("ellipsis");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("single-line-polaroid.png"), animations: "disabled" });
    const args = JSON.parse(call.postData()!); args[2].editing = true;
    const headers = { "next-action": call.headers()["next-action"], "content-type": call.headers()["content-type"] };
    const replay = (values: unknown[]) => page.evaluate(async ({ headers, values }) => (await (await fetch(location.href, { method: "POST", headers, body: JSON.stringify(values) })).text()), { headers, values });
    expect(await replay(args)).toContain('"ok":true');
    expect(await replay([args[0], args[1], { ...args[2], content: "첫 줄\n다음 줄" }])).toContain("글은 한 줄로 입력해 주십시오.");
    expect((await svc.from("clan_board_posts").select("content").eq("id", id).single()).data?.content).toBe(caption.trim());
    expect((await svc.from("clan_board_posts").update({ content: "이전 첫 줄\n다음 줄" }).eq("id", id)).error).toBeNull();
    await page.reload(); await expect(line).toHaveText("이전 첫 줄 다음 줄");
    await page.getByRole("button", { name: "편집", exact: true }).click();
    const editing = page.getByRole("dialog", { name: "글 편집", exact: true });
    expect(await editing.getByRole("textbox", { name: "글", exact: true }).textContent()).toBe("이전 첫 줄 다음 줄");
    await editing.getByRole("textbox", { name: "글", exact: true }).press("Control+Enter");
    await expect(editing).toBeHidden();
    expect((await svc.from("clan_board_posts").select("content").eq("id", id).single()).data?.content).toBe("이전 첫 줄 다음 줄");
    await page.goto(base + "/board/memories"); await expect(page.locator("[data-photo-caption]")).toHaveText("이전 첫 줄 다음 줄");
    await page.goto(base + "/board/free"); await page.getByRole("button", { name: "글 작성", exact: true }).click();
    const body = page.getByRole("dialog").getByRole("textbox", { name: "본문", exact: true });
    await expect(body).toHaveAttribute("aria-multiline", "true"); await body.fill("첫 줄\n다음 줄"); expect(await body.innerText()).toContain("\n");
    await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
  } finally {
    const bucket = svc.storage.from("clan-board-images"), prefix = `${f.clanId}/${f.users[0].id}`, paths: string[] = [];
    try {
      for (const folder of (await bucket.list(prefix)).data ?? []) for (const file of (await bucket.list(`${prefix}/${folder.name}`)).data ?? []) paths.push(`${prefix}/${folder.name}/${file.name}`);
      const posts = (await svc.from("clan_board_posts").select("image_path").eq("clan_id", f.clanId)).data ?? [];
      for (const post of posts) if (post.image_path) paths.push(post.image_path, boardThumbnail(post.image_path));
      if (paths.length) expect((await bucket.remove([...new Set(paths)])).error).toBeNull();
    } finally { await f.cleanup(); }
  }
});
