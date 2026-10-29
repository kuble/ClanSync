import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardDetails, boardThumbnail, validateBoardInput, type BoardDetails } from "../src/lib/clan/board";
import { memoryStyle } from "../src/lib/clan/cosmetics";
import { DEFAULT_STICKER_PLACEMENT, readPhotoStickerPlacement, stickerPlacementStyle, type PhotoStickerPlacement } from "../src/lib/clan/photo-sticker";

test.use({ hasTouch: true });

test("sticker placement validates coordinates, angles and flips while preserving legacy photos", () => {
  const placement = { x: 0, y: 100, rotation: -180, flipX: true, flipY: false };
  expect(readPhotoStickerPlacement(placement)).toEqual(placement);
  const details = { photoFrame: "tape", photoSticker: "gg", photoStickerPlacement: placement };
  expect(boardDetails(details)).toEqual(details);
  expect(validateBoardInput("memories", "사진", "한마디", details)).toBeNull();
  for (const invalid of [null, [], {}, { ...placement, x: -1 }, { ...placement, y: 101 }, { ...placement, x: "20" }, { ...placement, x: NaN }, { ...placement, rotation: Infinity }, { ...placement, rotation: 181 }, { ...placement, flipX: "true" }, { ...placement, extra: "bad" }, { ...placement, scale: 0.4 }, { ...placement, scale: 3.1 }, { ...placement, scale: "1" }]) {
    expect(readPhotoStickerPlacement(invalid)).toBeUndefined();
    expect(validateBoardInput("memories", "사진", "", { ...details, photoStickerPlacement: invalid } as BoardDetails)).not.toBeNull();
  }
  expect(validateBoardInput("free", "글", "본문", details)).not.toBeNull();
  expect(validateBoardInput("memories", "사진", "", { ...details, photoSticker: "none" })).not.toBeNull();
  expect(boardDetails({ photoFrame: "film", photoSticker: "heart" })).toEqual({ photoFrame: "film", photoSticker: "heart" });
  expect(memoryStyle(details, { frames: false, stickers: false, emojiSlots: 0 })).toMatchObject({ photoFrame: "classic", photoSticker: "none", photoStickerPlacement: undefined });
});

async function placementOf(scope: Locator): Promise<PhotoStickerPlacement> {
  const box = await scope.locator('[data-sticker-placement]').evaluate(el => { const s = (el as HTMLElement).style; return { x: parseFloat(s.left), y: parseFloat(s.top), rotation: Number(s.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1]), scale: Number((parseFloat(s.width) / 18).toFixed(2)) }; });
  return { ...box, flipX: await scope.getByRole("button", { name: "좌우 반전", exact: true }).getAttribute("aria-pressed") === "true", flipY: await scope.getByRole("button", { name: "상하 반전", exact: true }).getAttribute("aria-pressed") === "true" };
}

async function expectPlacement(node: Locator, placement: PhotoStickerPlacement) {
  await expect.poll(() => node.evaluate(el => { const { left, top, width, transform } = (el.closest('[data-sticker-placement]') as HTMLElement ?? el.parentElement as HTMLElement).style; return { left, top, width, transform }; })).toEqual(stickerPlacementStyle(placement));
}

async function resizeSticker(page: Page, scope: Locator, factor: number) {
  const corner = scope.getByRole("button", { name: "스티커 크기 조절 왼쪽 위", exact: true });
  await corner.scrollIntoViewIfNeeded();
  const box = (await scope.locator('[data-sticker-placement]').boundingBox())!, handle = (await corner.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
  await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(cx+(x-cx)*factor,cy+(y-cy)*factor,{steps:6}); await page.mouse.up();
}

async function rotateSticker(page: Page, scope: Locator, degrees: number) {
  const corner = scope.getByRole("button", { name: "스티커 회전", exact: true });
  await corner.scrollIntoViewIfNeeded();
  const box = (await scope.locator('[data-sticker-placement]').boundingBox())!, handle = (await corner.boundingBox())!;
  const cx=box.x+box.width/2,cy=box.y+box.height/2,x=handle.x+handle.width/2,y=handle.y+handle.height/2,r=degrees*Math.PI/180;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(cx+(x-cx)*Math.cos(r)-(y-cy)*Math.sin(r),cy+(x-cx)*Math.sin(r)+(y-cy)*Math.cos(r),{steps:8});await page.mouse.up();
}

async function touchDrag(page: Page, node: Locator, cancel = false, dx = 35, dy = 20) {
  await node.scrollIntoViewIfNeeded();
  const box = (await node.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx, y: y + dy }] });
    await session.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
  } finally { await session.detach(); }
}

test("photo pack previews and saved memories share movable, rotated and mirrored stickers", async ({ page, browser }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(2), svc = f.service, base = f.path.replace(/\/balance$/, "");
  const memberContext = await browser.newContext();
  try {
    expect((await svc.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]);
    await page.setViewportSize({ width: 1015, height: 884 });
    await page.goto(base + "/store");
    await page.getByRole("radio", { name: "사진", exact: true }).click();
    const stickerProduct = page.getByRole("article", { name: "추억 사진 스티커 팩", exact: true });
    await stickerProduct.getByRole("button", { name: "추억 사진 스티커 팩 미리보기", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "추억 사진 스티커 팩 미리보기", exact: true });
    const handle = preview.getByRole("button", { name: "스티커 위치 조절", exact: true });
    await expect(handle).toBeVisible();
    await preview.getByRole("button", { name: "하트", exact: true }).click();
    await expect(preview.getByRole("slider")).toHaveCount(0);
    await handle.focus();for(let i=0;i<5;i++)await handle.press("Shift+ArrowLeft");for(let i=0;i<4;i++)await handle.press("Shift+ArrowDown");
    await resizeSticker(page,preview,1.5);expect((await placementOf(preview)).scale).toBeGreaterThan(1);
    const beforeRotation=(await placementOf(preview)).rotation;await rotateSticker(page,preview,35);expect((await placementOf(preview)).rotation).toBeCloseTo(beforeRotation+35,0);
    await preview.getByRole("button", { name: "좌우 반전", exact: true }).click();
    await preview.getByRole("button", { name: "상하 반전", exact: true }).click();
    await expectPlacement(handle, await placementOf(preview));
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 - 30, { steps: 5 }); await page.mouse.up();
    expect((await placementOf(preview)).x).toBeGreaterThan(30);
    await handle.focus(); const beforeKey = await placementOf(preview); await handle.press("Shift+ArrowDown");
    expect((await placementOf(preview)).y).toBeCloseTo(beforeKey.y + 10, 2);
    await page.screenshot({ path: test.info().outputPath("sticker-pack-desktop.png"), animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    const beforeTouch = await placementOf(preview); await touchDrag(page, handle);
    expect((await placementOf(preview)).x).toBeGreaterThan(beforeTouch.x);
    const beforeCancel = await placementOf(preview); await touchDrag(page, handle, true);
    await expectPlacement(handle, beforeCancel);
    expect(await placementOf(preview)).toEqual(beforeCancel);
    await preview.getByRole("button", {name:"초기화",exact:true}).click();
    await touchDrag(page,preview.getByRole("button",{name:"스티커 크기 조절 오른쪽 아래",exact:true}),false,15,10);
    expect((await placementOf(preview)).scale).toBeGreaterThan(1);
    const buyBox = (await preview.getByRole("button", { name: "구매하기", exact: true }).boundingBox())!;
    expect(buyBox.y + buyBox.height).toBeLessThanOrEqual(844);
    expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("sticker-pack-mobile.png"), animations: "disabled" });
    await preview.getByRole("button", { name: "초기화", exact: true }).click();
    expect(await placementOf(preview)).toEqual(DEFAULT_STICKER_PLACEMENT);
    await preview.getByRole("button", { name: "닫기", exact: true }).click();
    expect((await svc.from("purchases").select("id").eq("clan_id", f.clanId)).data).toEqual([]);
    await page.setViewportSize({ width: 1015, height: 884 });
    await page.getByRole("button", { name: "추억 사진 프레임 팩 미리보기", exact: true }).click();
    const frames = page.getByRole("dialog", { name: "추억 사진 프레임 팩 미리보기", exact: true });
    await expect(frames.getByRole("button", {name:"기본",exact:true})).toHaveCount(0);
    await expect(frames.getByText("선택한 프레임",{exact:true})).toHaveCount(0);
    await expect(frames).toContainText("사진의 꾸미기 요소입니다.");
    await frames.getByRole("button", { name: "마스킹 테이프", exact: true }).click();
    await expect(frames.locator('[data-photo-frame="tape"]')).toBeVisible();
    await frames.getByRole("button", { name: "닫기", exact: true }).click();
    await stickerProduct.getByRole("button", { name: "추억 사진 스티커 팩 미리보기", exact: true }).click();
    expect(await placementOf(preview)).toEqual(DEFAULT_STICKER_PLACEMENT);
    await preview.getByRole("button", { name: "구매하기", exact: true }).click();
    const checkout = page.getByRole("dialog", { name: "꾸미기 구매", exact: true });
    await expect(checkout).toContainText("사진에 붙일 수 있는 스티커 팩입니다.");
    await checkout.getByRole("button", { name: "구매 확정", exact: true }).click(); await expect(checkout).toBeHidden();
    expect((await svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: "clan_photo_frames", p_checkout_id: randomUUID() })).data).toMatchObject({ ok: true });
    const stickerItem = (await svc.from("store_items").select("id").eq("slug", "clan_photo_stickers").single()).data!;
    const purchase = (await svc.from("purchases").select("id").eq("clan_id", f.clanId).eq("item_id", stickerItem.id).single()).data!;
    const member = await memberContext.newPage(); member.setDefaultTimeout(15_000); await loginIsolatedBalanceUser(member, f.users[1]);
    await member.goto(base + "/board/memories"); await member.getByRole("button", { name: "추억 남기기", exact: true }).click();
    const editor = member.getByRole("dialog", { name: "추억 남기기", exact: true });
    const buffer = await sharp({ create: { width: 400, height: 300, channels: 4, background: "#6fae96" } }).png().toBuffer();
    await editor.getByLabel("사진", { exact: true }).setInputFiles({ name: "memory.png", mimeType: "image/png", buffer });
    await editor.getByRole("group", {name:"프레임",exact:true}).getByRole("radio",{name:"마스킹 테이프",exact:true}).check();
    await editor.getByRole("group", {name:"스티커",exact:true}).getByRole("radio",{name:"GG",exact:true}).check();
    await expect(editor.getByRole("slider")).toHaveCount(0);
    const savedHandle=editor.getByRole("button",{name:"스티커 위치 조절",exact:true});await savedHandle.focus();
    for(let i=0;i<4;i++)await savedHandle.press("Shift+ArrowLeft");for(let i=0;i<5;i++)await savedHandle.press("Shift+ArrowDown");
    await resizeSticker(member,editor,1.3);await rotateSticker(member,editor,50);
    await editor.getByRole("button", { name: "좌우 반전", exact: true }).click();
    await editor.getByLabel("글", { exact: true }).fill("스티커 배치 검증");
    const placement = await placementOf(editor);
    const request = member.waitForRequest(req => req.headers()["next-action"] !== undefined && !!req.postData()?.includes("스티커 배치 검증"));
    await editor.getByRole("button", { name: "저장", exact: true }).click(); const call = await request;
    await expect(member).toHaveURL(/\/memories\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const saved = (await svc.from("clan_board_posts").select("id,details").eq("clan_id", f.clanId).eq("kind", "memories").single()).data!;
    expect(saved.details).toEqual({ photoFrame: "tape", photoSticker: "gg", photoStickerPlacement: placement });
    await expectPlacement(member.locator('[data-sticker-placement]'), placement); await member.reload(); await expectPlacement(member.locator('[data-sticker-placement]'), placement);
    await member.getByRole("button", { name: "편집", exact: true }).click();
    const editing = member.getByRole("dialog", { name: "글 편집", exact: true });
    expect(await placementOf(editing)).toEqual(placement); await editing.getByRole("button", { name: "취소", exact: true }).click();
    await member.goto(base + "/board/memories"); await expectPlacement(member.locator('[data-sticker-placement]'), placement);
    await member.setViewportSize({ width: 390, height: 844 }); await expectPlacement(member.locator('[data-sticker-placement]'), placement);
    await member.goto(base + "/board/memories/" + saved.id);
    const args = JSON.parse(call.postData()!); args[2].editing = true;
    const headers = { "next-action": call.headers()["next-action"], "content-type": call.headers()["content-type"] };
    const replay = (values: unknown[]) => member.evaluate(async ({ headers, values }) => (await (await fetch(location.href, { method: "POST", headers, body: JSON.stringify(values) })).text()), { headers, values });
    expect(await replay(args)).toContain('"ok":true');
    for (const invalid of [{ ...placement, x: -1 }, { ...placement, rotation: 181 }, { ...placement, flipY: "yes" }, { ...placement, scale: 4 }]) {
      expect(await replay([args[0], args[1], { ...args[2], details: { ...args[2].details, photoStickerPlacement: invalid } }])).toContain("스티커 위치와 회전을 확인해 주십시오.");
    }
    expect((await svc.from("clan_board_posts").select("details").eq("id", saved.id).single()).data?.details).toEqual(saved.details);
    expect((await svc.from("clan_board_posts").update({ details: { photoFrame: "film", photoSticker: "heart" } }).eq("id", saved.id)).error).toBeNull();
    await member.reload(); await expect(member.getByLabel("하트 스티커", { exact: true })).toBeVisible(); await expect(member.locator('[data-sticker-placement]')).toHaveCount(0);
    expect((await svc.from("clan_board_posts").update({ details: saved.details }).eq("id", saved.id)).error).toBeNull();
    expect((await svc.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await svc.rpc("void_clan_store_purchase", { p_actor_id: f.users[1].id, p_purchase_id: purchase.id, p_reason: "격리 스티커 배치 검증" })).data).toEqual({ ok: true });
    await member.reload(); await expect(member.locator('[data-photo-sticker="none"]')).toBeVisible();
    expect(await replay(args)).toContain("클랜에서 구매한 사진 꾸미기만 사용할 수 있습니다.");
    expect((await svc.from("clan_board_posts").select("details").eq("id", saved.id).single()).data?.details).toEqual(saved.details);
    expect((await svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: "clan_photo_stickers", p_checkout_id: randomUUID() })).data).toMatchObject({ ok: true });
    await member.reload(); await expectPlacement(member.locator('[data-sticker-placement]'), placement);
  } finally {
    try { await memberContext.close(); } finally {
      const rows = (await svc.from("clan_board_posts").select("image_path").eq("clan_id", f.clanId).not("image_path", "is", null)).data ?? [];
      if (rows.length) await svc.storage.from("clan-board-images").remove(rows.flatMap(row => [row.image_path!, boardThumbnail(row.image_path!)]));
      await f.cleanup();
    }
  }
});
