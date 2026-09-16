import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { loadTestEnv } from "../scripts/test-env.mjs";
import type { Database } from "../src/lib/supabase/database.types";

export type BalanceTestUser = {
  id: string;
  email: string;
  password: string;
  nickname: string;
};

/** Owns only freshly generated users and a clan in the allowlisted QA project. */
export async function createIsolatedBalanceFixture(userCount = 12) {
  const env = loadTestEnv();
  const service = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const tag = randomUUID().replaceAll("-", "").slice(0, 8);
  const users: BalanceTestUser[] = [];
  let clanId: string | null = null;
  async function cleanup() {
    const errors: string[] = [];
    if (clanId) {
      const { error } = await service.from("clans").delete().eq("id", clanId);
      if (error) errors.push(error.message);
    }
    for (const user of users) {
      const { error } = await service.auth.admin.deleteUser(user.id);
      if (error) errors.push(error.message);
    }
    if (errors.length)
      throw new Error(`Isolated fixture cleanup failed: ${errors.join("; ")}`);
  }
  try {
    const { data: game, error: gameError } = await service
      .from("games")
      .select("id")
      .eq("slug", "overwatch")
      .single();
    if (gameError) throw gameError;
    for (let index = 0; index < userCount; index++) {
      const email = `balance-ui-${tag}-${index}@clansync-qa.local`;
      const password = `${randomUUID()}aA1!`;
      const nickname = `ui${tag.slice(0, 4)}_${String(index).padStart(2, "0")}`;
      const { data, error } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname, birth_year: 2000 },
      });
      if (error || !data.user)
        throw error ?? new Error("Failed to create isolated user");
      users.push({ id: data.user.id, email, password, nickname });
    }
    const { error: profileError } = await service
      .from("user_game_profiles")
      .insert(
        users.map((user) => ({
          user_id: user.id,
          game_id: game.id,
          game_uid: `balance_ui_${tag}_${user.id}`,
          is_verified: true,
          verified_at: new Date().toISOString(),
        })),
      );
    if (profileError) throw profileError;
    const { data: clan, error: clanError } = await service
      .from("clans")
      .insert({
        game_id: game.id,
        name: `BalanceUI-${tag}`,
        subscription_tier: "premium",
      })
      .select("id")
      .single();
    if (clanError) throw clanError;
    clanId = clan.id;
    const { error: membershipError } = await service
      .from("clan_members")
      .insert(
        users.map((user, index) => ({
          clan_id: clan.id,
          user_id: user.id,
          role: index === 0 ? ("leader" as const) : ("member" as const),
          status: "active" as const,
        })),
      );
    if (membershipError) throw membershipError;
    return {
      service,
      clanId: clan.id,
      gameId: game.id,
      users,
      cleanup,
      path: `/games/overwatch/clan/${clan.id}/balance`,
      async activeRound(seriesId?: string) {
        let query = service
          .from("balance_sessions")
          .select("*")
          .eq("clan_id", clan.id)
          .is("closed_at", null);
        if (seriesId) query = query.eq("series_id", seriesId);
        const { data, error } = await query.single();
        if (error) throw error;
        return data;
      },
      async memberClient(index: number) {
        const client = createClient<Database>(
          env.NEXT_PUBLIC_SUPABASE_URL!,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { error } = await client.auth.signInWithPassword({
          email: users[index].email,
          password: users[index].password,
        });
        if (error) throw error;
        return client;
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function loginIsolatedBalanceUser(
  page: Page,
  user: BalanceTestUser,
) {
  await page.goto("/sign-in");
  await page.getByLabel("이메일").fill(user.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(/\/games\/?$/, { timeout: 45_000 });
}

export async function createAndEnterBalanceRoom(
  page: Page,
  path: string,
  title = "회귀 검증 내전",
  kind: "regular" | "flash" = "regular",
) {
  await page.goto(path);
  await page.getByRole("button", { name: "내전 추가", exact: true }).click();
  const create = page.getByRole("dialog", { name: "내전 만들기", exact: true });
  await create.getByRole("radio", {
    name: kind === "regular" ? "정규 내전" : "깜짝 내전",
    exact: true,
  }).check();
  await create.getByRole("textbox", { name: "내전 이름", exact: true }).fill(title);
  await create.getByRole("button", { name: "내전 만들기", exact: true }).click();
  await expect(create).toBeHidden({ timeout: 20_000 });
  const row = page.getByTestId("balance-lobby-room").filter({
    hasText: title,
  });
  await expect(row).toBeVisible({ timeout: 20_000 });
  const roomId = await row.getAttribute("data-room-id");
  if (!roomId) throw new Error("Created room is missing its identifier");
  await row.getByRole("link", { name: "입장", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("room") === roomId);
  await expect(page.getByTestId("clan-balance-session-panel")).toHaveAttribute(
    "data-balance-phase", "editing", { timeout: 20_000 },
  );
  return { roomId, url: page.url() };
}
