import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { boardDetails, boardThumbnail, validateBoardInput, type BoardDetails } from "../src/lib/clan/board";
import { memoryStyle } from "../src/lib/clan/cosmetics";
import { DEFAULT_STICKER_PLACEMENT, readPhotoStickerPlacement, stickerPlacementStyle, type PhotoStickerPlacement, type PhotoStickerInstance, readPhotoStickers, editablePhotoStickers, MAX_PHOTO_STICKERS } from "../src/lib/clan/photo-sticker";

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
  const box = await scope.locator('[data-sticker-placement][data-selected=true]').evaluate(el => { const s = (el as HTMLElement).style; return { x: parseFloat(s.left), y: parseFloat(s.top), rotation: Number(s.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1]), scale: Number((parseFloat(s.width) / 18).toFixed(2)) }; });
  return { ...box, flipX: await scope.getByRole("button", { name: "좌우 반전", exact: true }).getAttribute("aria-pressed") === "true", flipY: await scope.getByRole("button", { name: "상하 반전", exact: true }).getAttribute("aria-pressed") === "true" };
}

async function expectPlacement(node: Locator, placement: PhotoStickerPlacement) {
  await expect.poll(() => node.evaluate(el => { const { left, top, width, transform } = (el.closest('[data-sticker-placement]') as HTMLElement ?? el.parentElement as HTMLElement).style; return { left, top, width, transform }; })).toEqual(stickerPlacementStyle(placement));
}

async function resizeSticker(page: Page, scope: Locator, factor: number) {
  const corner = scope.getByRole("button", { name: "스티커 크기 조절 왼쪽 위", exact: true });
  await corner.scrollIntoViewIfNeeded();
  const box = (await scope.locator('[data-sticker-placement][data-selected=true]').boundingBox())!, handle = (await corner.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
  await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(cx+(x-cx)*factor,cy+(y-cy)*factor,{steps:6}); await page.mouse.up();
}

async function rotateSticker(page: Page, scope: Locator, degrees: number) {
  const corner = scope.getByRole("button", { name: "스티커 회전", exact: true });
  await corner.scrollIntoViewIfNeeded();
  const box = (await scope.locator('[data-sticker-placement][data-selected=true]').boundingBox())!, handle = (await corner.boundingBox())!;
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

test("multiple stickers validate identity, count, placement and legacy conversion", () => {
  const item: PhotoStickerInstance = { id: randomUUID(), sticker: "gg", placement: { ...DEFAULT_STICKER_PLACEMENT } };
  const details = { photoFrame: "classic", photoStickers: [item, { ...item, id: randomUUID() }] };
  expect(readPhotoStickers(details.photoStickers)).toEqual(details.photoStickers);
  expect(boardDetails(details)).toEqual(details);
  expect(editablePhotoStickers({ photoSticker: "heart" })).toMatchObject([{ sticker: "heart", placement: DEFAULT_STICKER_PLACEMENT }]);
  expect(editablePhotoStickers({ photoSticker: "heart", photoStickers: [] })).toEqual([]);
  expect(validateBoardInput("memories", "사진", "", details)).toBeNull();
  expect(validateBoardInput("free", "글", "본문", details)).not.toBeNull();
  expect(memoryStyle(details, { frames: false, stickers: false, emojiSlots: 0 }).photoStickers).toEqual([]);
  for (const photoStickers of [null, {}, [item, item], Array.from({ length: MAX_PHOTO_STICKERS + 1 }, () => ({ ...item, id: randomUUID() })), [{ ...item, id: "bad" }], [{ ...item, sticker: "fake" }], [{ ...item, extra: true }], [{ ...item, placement: { ...item.placement, scale: 4 } }]]) {
    expect(readPhotoStickers(photoStickers)).toBeUndefined();
    expect(validateBoardInput("memories", "사진", "", { photoStickers } as BoardDetails)).not.toBeNull();
  }
  expect(validateBoardInput("memories", "사진", "", { ...details, photoSticker: "heart" })).not.toBeNull();
});

test("photo packs and saved photos edit multiple stickers independently through two-level tabs", async ({ page, browser }) => {
  test.setTimeout(240_000); page.setDefaultTimeout(15_000);
  const f = await createIsolatedBalanceFixture(2), svc = f.service, base = f.path.replace(/\/balance$/, "");
  const memberContext = await browser.newContext();
  try {
    const client = await f.memberClient(1);
    const forged = { id: randomUUID(), sticker: "gg", placement: DEFAULT_STICKER_PLACEMENT };
    const fakeId = randomUUID(), fake = { id: fakeId, clan_id: f.clanId, kind: "memories" as const, title: "배치 경계", image_path: `${f.clanId}/${f.users[1].id}/${fakeId}/${randomUUID()}.png` };
    expect((await client.from("clan_board_posts").insert({ ...fake, details: { photoStickers: [forged] } })).error?.code).toBe("23514");
    expect((await client.from("clan_board_posts").insert({ ...fake, details: { photoStickers: [] } })).error).toBeNull();
    expect((await client.from("clan_board_posts").delete().eq("id", fakeId)).error).toBeNull();
    expect((await svc.from("clans").update({ coin_balance: 1000 }).eq("id", f.clanId)).error).toBeNull();
    await loginIsolatedBalanceUser(page, f.users[0]); await page.setViewportSize({ width: 1015, height: 884 });
    await page.goto(base + "/store"); await page.getByRole("radio", { name: "사진", exact: true }).click();
    const product = page.getByRole("article", { name: "추억 사진 스티커 팩", exact: true });
    await product.getByRole("button", { name: "추억 사진 스티커 팩 미리보기", exact: true }).click();
    const preview = page.getByRole("dialog", { name: "추억 사진 스티커 팩 미리보기", exact: true });
    const original = await placementOf(preview);
    await preview.getByRole("button", { name: "하트 추가", exact: true }).click();
    await expect(preview.locator('[data-sticker-id]')).toHaveCount(2);
    await resizeSticker(page, preview, 1.4); await rotateSticker(page, preview, 35);
    await preview.getByRole("button", { name: "좌우 반전", exact: true }).click();
    expect((await placementOf(preview)).scale).toBeGreaterThan(1);
    await expectPlacement(preview.locator('[data-sticker-id]').first(), original);
    await page.setViewportSize({ width: 390, height: 844 });
    const handle = preview.getByRole("button", { name: "스티커 위치 조절 2", exact: true });
    const beforeTouch = await placementOf(preview); await touchDrag(page, handle, false, 15, 8);
    expect((await placementOf(preview)).x).toBeGreaterThan(beforeTouch.x);
    const beforeCancel = await placementOf(preview); await touchDrag(page, handle, true); expect(await placementOf(preview)).toEqual(beforeCancel);
    expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("multiple-stickers-mobile.png"), animations: "disabled" });
    await preview.getByRole("button", { name: "선택한 스티커 삭제", exact: true }).click();
    await expect(preview.locator('[data-sticker-id]')).toHaveCount(1);
    await preview.getByRole("button", { name: "닫기", exact: true }).click();
    await page.setViewportSize({ width: 1015, height: 884 });
    await page.getByRole("button", { name: "추억 사진 프레임 팩 미리보기", exact: true }).click();
    const frames = page.getByRole("dialog", { name: "추억 사진 프레임 팩 미리보기", exact: true });
    await expect(frames.getByRole("tab", { name: "기본", exact: true })).toHaveCount(0);
    await frames.getByRole("radio", { name: "마스킹 테이프", exact: true }).check();
    await expect(frames.locator('[data-photo-frame="tape"]').first()).toBeVisible();
    await frames.getByRole("button", { name: "닫기", exact: true }).click();
    for (const slug of ["clan_photo_stickers", "clan_photo_frames"]) expect((await svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: slug, p_checkout_id: randomUUID() })).data).toMatchObject({ ok: true });
    const stickerItem = (await svc.from("store_items").select("id").eq("slug", "clan_photo_stickers").single()).data!;
    const purchase = (await svc.from("purchases").select("id").eq("clan_id", f.clanId).eq("item_id", stickerItem.id).single()).data!;
    const member = await memberContext.newPage(); member.setDefaultTimeout(15_000); await loginIsolatedBalanceUser(member, f.users[1]);
    await member.goto(base + "/board/memories"); await member.getByRole("button", { name: "추억 남기기", exact: true }).click();
    const editor = member.getByRole("dialog", { name: "추억 남기기", exact: true });
    const buffer = await sharp({ create: { width: 640, height: 480, channels: 4, background: "#9bb7a5" } }).png().toBuffer();
    await editor.getByLabel("사진", { exact: true }).setInputFiles({ name: "memory.png", mimeType: "image/png", buffer });
    await editor.getByRole("tab", { name: "추억 사진 프레임 팩", exact: true }).click();
    await editor.getByRole("radio", { name: "마스킹 테이프", exact: true }).check();
    await editor.getByRole("tab", { name: "스티커", exact: true }).click();
    await expect(editor.getByRole("radio", { name: "마스킹 테이프", exact: true })).toHaveCount(0);
    await editor.getByRole("tab", { name: "추억 사진 스티커 팩", exact: true }).click();
    await editor.getByRole("button", { name: "GG 추가", exact: true }).click();
    const firstId = (await editor.locator('[data-sticker-id]').getAttribute("data-sticker-id"))!;
    const firstHandle = editor.getByRole("button", { name: "스티커 위치 조절 1", exact: true });
    await firstHandle.focus(); await firstHandle.press("Shift+ArrowLeft");
    await resizeSticker(member, editor, 1.3); await rotateSticker(member, editor, 35);
    const firstPlacement = await placementOf(editor);
    await editor.getByRole("button", { name: "GG 추가", exact: true }).click();
    await editor.getByRole("button", { name: "하트 추가", exact: true }).click();
    await expect(editor.locator('[data-sticker-id]')).toHaveCount(3);
    await editor.getByRole("button", { name: "스티커 위치 조절 3", exact: true }).press("Delete");
    await expect(editor.locator('[data-sticker-id]')).toHaveCount(2);
    const secondHandle = editor.getByRole("button", { name: "스티커 위치 조절 2", exact: true });
    await editor.getByRole("button", { name: "붙인 스티커 2 선택", exact: true }).click(); await secondHandle.press("Shift+ArrowRight"); await secondHandle.press("Shift+ArrowDown");
    await resizeSticker(member, editor, 0.8); await rotateSticker(member, editor, -25);
    const secondPlacement = await placementOf(editor);
    await expectPlacement(editor.locator(`[data-sticker-id="${firstId}"]`), firstPlacement);
    await editor.getByRole("tab", { name: "프레임", exact: true }).click();
    await expect(editor.getByRole("tab", { name: "추억 사진 프레임 팩", exact: true })).toHaveAttribute("aria-selected", "true");
    await editor.getByRole("radio", { name: "필름", exact: true }).check();
    await expectPlacement(editor.locator(`[data-sticker-id="${firstId}"]`), firstPlacement);
    await editor.getByRole("tab", { name: "스티커", exact: true }).click();
    for (let i = 2; i < MAX_PHOTO_STICKERS; i++) await editor.getByRole("button", { name: "하트 추가", exact: true }).click();
    await expect(editor.getByRole("button", { name: "GG 추가", exact: true })).toBeDisabled();
    for (let i = MAX_PHOTO_STICKERS; i > 2; i--) { await editor.getByRole("button", { name: `스티커 위치 조절 ${i}`, exact: true }).focus(); await editor.getByRole("button", { name: "선택한 스티커 삭제", exact: true }).click(); }
    await editor.getByLabel("글", { exact: true }).fill("여러 스티커 배치 검증");
    const tabsBox = (await editor.getByRole("tablist", { name: "사진 꾸미기 종류", exact: true }).boundingBox())!;
    const photoBox = (await editor.locator('[data-photo-frame="film"]').first().boundingBox())!;
    expect(tabsBox.y).toBeGreaterThan(photoBox.y + photoBox.height);
    await member.screenshot({ path: test.info().outputPath("multiple-stickers-editor.png"), animations: "disabled" });
    const request = member.waitForRequest(req => req.headers()["next-action"] !== undefined && !!req.postData()?.includes("여러 스티커 배치 검증"));
    await editor.getByRole("button", { name: "저장", exact: true }).click(); const call = await request;
    await expect(member).toHaveURL(/\/memories\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const saved = (await svc.from("clan_board_posts").select("id,details").eq("clan_id", f.clanId).eq("kind", "memories").single()).data!;
    const items = (saved.details as unknown as BoardDetails).photoStickers!;
    expect(items).toHaveLength(2); expect(items[0].placement).toEqual(firstPlacement); expect(items[1].placement).toEqual(secondPlacement);
    const checkSaved = async () => { for (const item of items) await expectPlacement(member.locator(`[data-sticker-id="${item.id}"]`), item.placement); };
    await checkSaved(); await member.reload(); await checkSaved();
    await member.getByRole("button", { name: "편집", exact: true }).click();
    const editing = member.getByRole("dialog", { name: "글 편집", exact: true });
    await expect(editing.locator('[data-sticker-id]')).toHaveCount(2);
    await editing.getByRole("button", { name: "스티커 위치 조절 1", exact: true }).click(); await expect(editing.getByRole("button", { name: "스티커 회전", exact: true })).toHaveCount(1);
    await editing.getByRole("button", { name: "취소", exact: true }).click();
    await member.goto(base + "/board/memories"); await member.setViewportSize({ width: 390, height: 844 }); await checkSaved();
    await member.goto(base + "/board/memories/" + saved.id);
    const args = JSON.parse(call.postData()!); args[2].editing = true;
    const headers = { "next-action": call.headers()["next-action"], "content-type": call.headers()["content-type"] };
    const replay = (values: unknown[]) => member.evaluate(async ({ headers, values }) => (await (await fetch(location.href, { method: "POST", headers, body: JSON.stringify(values) })).text()), { headers, values });
    expect(await replay(args)).toContain('"ok":true');
    for (const invalid of [null, [items[0], items[0]], [{ ...items[0], sticker: "fake" }], [{ ...items[0], placement: { ...items[0].placement, scale: 4 } }], Array.from({ length: MAX_PHOTO_STICKERS + 1 }, () => ({ ...items[0], id: randomUUID() }))]) {
      expect(await replay([args[0], args[1], { ...args[2], details: { photoStickers: invalid } }])).toContain("스티커 목록과 배치를 확인해 주십시오.");
      expect((await client.from("clan_board_posts").update({ details: { photoStickers: invalid } }).eq("id", saved.id)).error?.code).toBe("23514");
    }
    expect((await client.from("clan_board_posts").update({ kind: "free" }).eq("id", saved.id)).error?.code).toBe("42501");
    expect((await svc.from("clan_board_posts").update({ kind: "free" }).eq("id", saved.id)).error?.code).toBe("23514");
    expect((await svc.from("clan_board_posts").select("details").eq("id", saved.id).single()).data?.details).toEqual(saved.details);
    expect((await svc.from("clan_board_posts").update({ details: { photoFrame: "film", photoSticker: "heart" } }).eq("id", saved.id)).error).toBeNull();
    await member.reload(); await expect(member.getByLabel("하트 스티커", { exact: true })).toBeVisible();
    await member.getByRole("button", { name: "편집", exact: true }).click();
    const legacy = member.getByRole("dialog", { name: "글 편집", exact: true }); await expect(legacy.locator('[data-sticker-id]')).toHaveCount(1); await legacy.getByRole("button", { name: "취소", exact: true }).click();
    expect((await svc.from("clan_board_posts").update({ details: saved.details }).eq("id", saved.id)).error).toBeNull();
    expect((await svc.from("clan_members").update({ role: "officer" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id)).error).toBeNull();
    expect((await svc.rpc("void_clan_store_purchase", { p_actor_id: f.users[1].id, p_purchase_id: purchase.id, p_reason: "격리 여러 스티커 검증" })).data).toEqual({ ok: true });
    await member.reload(); await expect(member.locator('[data-sticker-id]')).toHaveCount(0);
    expect(await replay(args)).toContain("클랜에서 구매한 사진 꾸미기만 사용할 수 있습니다.");
    expect((await client.from("clan_board_posts").update({ details: saved.details }).eq("id", saved.id)).error?.code).toBe("23514");
    expect((await svc.rpc("apply_store_purchase", { p_actor_id: f.users[0].id, p_context_clan_id: f.clanId, p_item_slug: "clan_photo_stickers", p_checkout_id: randomUUID() })).data).toMatchObject({ ok: true });
    await member.reload(); await checkSaved();
  } finally {
    try { await memberContext.close(); } finally {
      const rows = (await svc.from("clan_board_posts").select("image_path").eq("clan_id", f.clanId).not("image_path", "is", null)).data ?? [];
      if (rows.length) await svc.storage.from("clan-board-images").remove(rows.flatMap(row => [row.image_path!, boardThumbnail(row.image_path!)]));
      await f.cleanup();
    }
  }
});
