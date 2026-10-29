import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createIsolatedBalanceFixture, loginIsolatedBalanceUser } from "./isolated-balance-fixture";
import { parseRoster, rosterAssignedUserIds } from "../src/lib/balance/roster-schema";

test.use({ actionTimeout: 15_000 });
async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const result = await query; expect(result.error, JSON.stringify(result.error)).toBeNull(); return result.data as NonNullable<T>;
}
const after = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const minuteNow = () => new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();

test("attendance poll: exact window, permissions, both vote paths, edits, disable, early open and cancellation", async () => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3);
  try {
    const owner = await f.memberClient(1), voter = await f.memberClient(2);
    const create = { p_clan_id: f.clanId, p_kind: "flash", p_title: "참석 연동", p_scheduled_at: after(120), p_rsvp_opens_at: after(60) };
    for (const args of [
      { ...create, p_kind: "regular" }, { ...create, p_rsvp_opens_at: after(180) },
      { ...create, p_rsvp_opens_at: after(-60) }, { ...create, p_rsvp_days: 3 },
      { ...create, p_scheduled_at: undefined }, { ...create, p_clan_id: randomUUID() },
    ]) expect((await owner.rpc("create_balance_room", args)).error).not.toBeNull();
    const room = await ok(owner.rpc("create_balance_room", create)) as { room_id: string };
    const roomArgs = { p_clan_id: f.clanId, p_room_id: room.room_id };
    const poll = () => ok(f.service.from("clan_polls").select("*").eq("balance_room_id", room.room_id).single());
    const original = await poll();
    const options = await ok(f.service.from("poll_options").select("id,label,sort_order").eq("poll_id", original.id).order("sort_order"));
    expect(options.map(o => o.label)).toEqual(["참석", "불참"]);
    const vote = (index: number) => voter.rpc("submit_clan_poll_vote", { p_clan_id: f.clanId, p_poll_id: original.id, p_option_ids: [options[index].id] });
    expect((await vote(0)).error).not.toBeNull();
    expect((await voter.rpc("set_balance_room_rsvp", { ...roomArgs, p_response: "going" })).error).not.toBeNull();
    const update = { ...roomArgs, p_title: "변경된 내전", p_scheduled_at: after(180), p_rsvp_opens_at: minuteNow() };
    expect((await voter.rpc("update_balance_room", update)).error).not.toBeNull();
    await ok(owner.rpc("update_balance_room", update));
    expect(await poll()).toMatchObject({ id: original.id, title: "변경된 내전 참석 투표", starts_at: expect.any(String), closed_at: null });
    const participation = () => ok(f.service.from("balance_room_rsvps").select("response").eq("room_id", room.room_id).eq("user_id", f.users[2].id).single());
    await ok(vote(0)); expect((await participation()).response).toBe("going");
    await ok(vote(1)); expect((await participation()).response).toBe("no");
    await ok(voter.rpc("set_balance_room_rsvp", { ...roomArgs, p_response: "going" }));
    const ballot = () => ok(f.service.from("poll_votes").select("option_id").eq("poll_id", original.id).eq("user_id", f.users[2].id));
    expect(await ballot()).toEqual([{ option_id: options[0].id }]);
    await Promise.all([ok(vote(0)), ok(vote(1))]);
    const final = await ballot(); expect(final).toHaveLength(1);
    expect((await participation()).response).toBe(final[0].option_id === options[0].id ? "going" : "no");
    expect((await voter.rpc("set_balance_room_rsvp", { ...roomArgs, p_response: "maybe" })).error).not.toBeNull();
    expect((await voter.rpc("submit_clan_poll_vote", { p_clan_id: f.clanId, p_poll_id: original.id, p_option_ids: [randomUUID()] })).error).not.toBeNull();
    await ok(owner.rpc("update_balance_room", { ...update, p_rsvp_opens_at: undefined }));
    expect((await poll()).closed_at).not.toBeNull(); expect((await vote(0)).error).not.toBeNull();
    await ok(owner.rpc("update_balance_room", update));
    expect((await poll()).id).toBe(original.id); expect(await ballot()).toEqual(final);
    await ok(owner.rpc("open_balance_room", roomArgs));
    expect((await poll()).closed_at).not.toBeNull(); expect((await vote(0)).error).not.toBeNull();
    const round = await f.activeRound(room.room_id);
    expect(rosterAssignedUserIds(parseRoster(round.roster))).toEqual([]);
    const cancelled = await ok(owner.rpc("create_balance_room", create)) as { room_id: string };
    await ok(owner.rpc("cancel_balance_room", { p_clan_id: f.clanId, p_room_id: cancelled.room_id }));
    expect((await ok(f.service.from("clan_polls").select("closed_at").eq("balance_room_id", cancelled.room_id).single())).closed_at).not.toBeNull();
  } finally { await f.cleanup(); }
});

test("member creates a minute-based reservation and attendance poll, then event votes update lobby participation", async ({ page, browser }) => {
  test.setTimeout(150_000);
  const f = await createIsolatedBalanceFixture(3), context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    await loginIsolatedBalanceUser(page, f.users[1]);
    await page.goto(f.path);
    await page.getByRole("button", { name: "내전 만들기", exact: true }).click();
    const create = page.getByRole("dialog", { name: "내전 만들기", exact: true });
    await create.getByRole("textbox", { name: "내전 이름", exact: true }).fill("UI 참석 연동");
    await create.getByRole("radio", { name: "예약", exact: true }).check();
    await expect(create.getByRole("listbox", { name: "초", exact: true })).toHaveCount(0);
    await expect(create.getByText("위아래로 드래그하거나 스크롤해 선택하십시오.", { exact: true })).toHaveCount(0);
    await expect(create.getByText("응답은 출전 명단에 자동 등록되지 않습니다.", { exact: true })).toHaveCount(0);
    const toggle = create.getByRole("switch", { name: "참석 투표 자동 개설", exact: true });
    const timing = create.getByRole("group", { name: "투표 개설 날짜·시각 (한국 시간)", exact: true });
    await toggle.uncheck(); await expect(timing).toHaveCount(0); await toggle.check();
    await create.getByRole("button", { name: "참석 투표 자동 개설", exact: true }).focus();
    const help = page.getByRole("tooltip").filter({ hasText: "이벤트의 참석·불참" });
    await expect(help).toBeVisible(); await page.keyboard.press("Escape"); await expect(create).toBeVisible();
    const allIds = await create.locator('[role="option"]').evaluateAll(nodes => nodes.map(n => n.id));
    expect(new Set(allIds).size).toBe(allIds.length);
    const content = create.locator("form > fieldset");
    const submit = create.locator("form").getByRole("button", { name: "내전 만들기", exact: true });
    for (const width of [320, 390, 1304]) {
      await page.setViewportSize({ width, height: 884 });
      expect(await create.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(content).toHaveCSS("scrollbar-width", "thin");
      const footerY = (await submit.boundingBox())!.y;
      await content.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await expect(toggle).toBeInViewport();
      expect((await submit.boundingBox())!.y).toBe(footerY);
      await page.screenshot({ path: test.info().outputPath(`create-room-${width}.png`) });
    }
    await create.locator("form").getByRole("button", { name: "내전 만들기", exact: true }).click(); await expect(create).toBeHidden();
    const room = await ok(f.service.from("balance_rooms").select("*").eq("clan_id", f.clanId).eq("title", "UI 참석 연동").single());
    expect(new Date(room.scheduled_at).getUTCSeconds()).toBe(0);
    expect(new Date(room.rsvp_opens_at!).getUTCSeconds()).toBe(0);
    const poll = await ok(f.service.from("clan_polls").select("id").eq("balance_room_id", room.id).single());
    const voter = await context.newPage(); await loginIsolatedBalanceUser(voter, f.users[2]);
    await voter.goto(f.path.replace(/balance$/, `events?tab=polls&poll=${poll.id}`));
    const detail = voter.getByRole("dialog", { name: "UI 참석 연동 참석 투표", exact: true });
    await detail.getByText("참석", { exact: true }).click();
    await detail.getByRole("button", { name: "투표하기", exact: true }).click();
    await expect(detail.getByText("참여 완료", { exact: true })).toBeVisible();
    await voter.goto(f.path);
    const row = voter.getByTestId("balance-lobby-room").filter({ hasText: "UI 참석 연동" });
    await expect(row).toContainText("참여 2");
    await row.getByRole("button", { name: "참여 취소", exact: true }).click();
    await expect(row).toContainText("참여 1");
    const options = await ok(f.service.from("poll_options").select("id").eq("poll_id", poll.id).eq("label", "불참").single());
    expect(await ok(f.service.from("poll_votes").select("option_id").eq("poll_id", poll.id).eq("user_id", f.users[2].id))).toEqual([{ option_id: options.id }]);
  } finally { await context.close(); await f.cleanup(); }
});
