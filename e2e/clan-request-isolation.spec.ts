import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "../scripts/test-env.mjs";
import { resolveClanPermission } from "../src/lib/clan/clan-access-snapshot";

test("permission snapshots keep locked roles and invalid-settings denial", () => {
  expect(resolveClanPermission("leader", "kick_officer", null)).toBe(true);
  expect(
    resolveClanPermission("member", "kick_officer", {
      kick_officer: ["member"],
    }),
  ).toBe(false);
  expect(resolveClanPermission("officer", "approve_join_requests", null)).toBe(
    true,
  );
  expect(resolveClanPermission("leader", "manage_clan_events", null)).toBe(
    false,
  );
  expect(resolveClanPermission("leader", "manage_clan_events", [])).toBe(false);
  expect(resolveClanPermission("leader", "manage_clan_events", {})).toBe(true);
  expect(resolveClanPermission("member", "manage_clan_events", {})).toBe(false);
  expect(
    resolveClanPermission("member", "manage_clan_events", {
      manage_clan_events: ["member"],
    }),
  ).toBe(true);
});

test("RSC request data stays isolated between accounts and refreshes changed permissions", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const env = loadTestEnv();
  const svc = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const tag = crypto.randomUUID().slice(0, 8);
  const users: { id: string; email: string; password: string }[] = [];
  const contexts = await Promise.all([
    browser.newContext({ baseURL }),
    browser.newContext({ baseURL }),
  ]);
  let clanId: string | undefined;
  try {
    for (let index = 0; index < 2; index++) {
      const email = `render-${tag}-${index}@clansync-qa.local`;
      const password = `${crypto.randomUUID()}aA1!`;
      const created = await svc.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: `rq_${tag}_${index}`, birth_year: 2000 },
      });
      expect(created.error).toBeNull();
      users.push({ id: created.data.user!.id, email, password });
    }
    const game = await svc
      .from("games")
      .select("id")
      .eq("slug", "overwatch")
      .single();
    expect(game.error).toBeNull();
    const clan = await svc
      .from("clans")
      .insert({ name: `Request-${tag}`, game_id: game.data!.id })
      .select("id")
      .single();
    expect(clan.error).toBeNull();
    clanId = clan.data!.id;
    const setup = await Promise.all([
      svc.from("clan_members").insert(
        users.map((user, index) => ({
          clan_id: clanId!,
          user_id: user.id,
          role: index === 0 ? "leader" : "member",
          status: "active",
        })),
      ),
      svc.from("user_game_profiles").insert(
        users.map((user) => ({
          user_id: user.id,
          game_id: game.data!.id,
          game_uid: `request-${user.id}`,
          is_verified: true,
        })),
      ),
      svc
        .from("clan_settings")
        .upsert({
          clan_id: clanId,
          permissions: { manage_clan_events: ["leader"] },
        }),
    ]);
    for (const result of setup) expect(result.error).toBeNull();
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto("/sign-in");
        await page
          .getByLabel("이메일", { exact: true })
          .fill(users[index].email);
        await page
          .getByLabel("비밀번호", { exact: true })
          .fill(users[index].password);
        await page.getByRole("button", { name: "로그인", exact: true }).click();
        await page.waitForURL(/\/games\/?$/);
      }),
    );
    const base = `/games/overwatch/clan/${clanId}`;
    await Promise.all(pages.map((page) => page.goto(base)));
    const leader = pages[0];
    const member = pages[1];
    await expect(
      leader.getByRole("link", { name: "내전 시작", exact: true }),
    ).toBeVisible();
    await expect(
      member.getByRole("link", { name: "내전 시작", exact: true }),
    ).toHaveCount(0);
    await expect(
      leader
        .getByRole("navigation", { name: "클랜 메뉴", exact: true })
        .getByRole("link", { name: "클랜 관리", exact: true }),
    ).toBeVisible();
    await expect(
      member
        .getByRole("navigation", { name: "클랜 메뉴", exact: true })
        .getByRole("link", { name: "클랜 관리", exact: true }),
    ).toHaveCount(0);

    expect(
      (
        await svc
          .from("clan_settings")
          .update({ permissions: { manage_clan_events: ["member"] } })
          .eq("clan_id", clanId)
      ).error,
    ).toBeNull();
    await Promise.all(pages.map((page) => page.reload()));
    await expect(
      leader.getByRole("link", { name: "내전 시작", exact: true }),
    ).toHaveCount(0);
    await expect(
      member.getByRole("link", { name: "내전 시작", exact: true }),
    ).toBeVisible();
    expect(
      (
        await svc
          .from("clan_members")
          .update({ role: "officer" })
          .eq("clan_id", clanId)
          .eq("user_id", users[1].id)
      ).error,
    ).toBeNull();
    await member.reload();
    await expect(
      member
        .getByRole("navigation", { name: "클랜 메뉴", exact: true })
        .getByRole("link", { name: "클랜 관리", exact: true }),
    ).toBeVisible();
    await expect(
      member.getByRole("link", { name: "내전 시작", exact: true }),
    ).toHaveCount(0);
    await expect(
      leader.getByRole("link", { name: "내전 시작", exact: true }),
    ).toHaveCount(0);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    if (clanId)
      expect(
        (await svc.from("clans").delete().eq("id", clanId)).error,
      ).toBeNull();
    for (const user of users)
      expect((await svc.auth.admin.deleteUser(user.id)).error).toBeNull();
  }
});
