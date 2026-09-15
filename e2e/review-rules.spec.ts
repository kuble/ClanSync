import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { hasClanPermission } from "../src/lib/clan/has-clan-permission";
import { allowDevGameLink } from "../src/lib/auth/allow-dev-game-link";
import { parseEventStart } from "../src/lib/clan/parse-event-start";

test("R04 permission errors and missing settings fail closed", async () => {
  function client(role: string, settings: unknown, error: unknown = null, membershipError: unknown = null) {
    return {
      rpc: async () => ({ data: [{ role, status: "active" }], error: membershipError }),
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: settings, error }) }) }) }),
    } as unknown as SupabaseClient<Database>;
  }
  for (const role of ["member", "officer", "leader"]) {
    expect(await hasClanPermission(client(role, null), "uid", "cid", "kick_member")).toBe(false);
    expect(await hasClanPermission(client(role, { permissions: {} }, { message: "DB error" }), "uid", "cid", "kick_member")).toBe(false);
    expect(await hasClanPermission(client(role, { permissions: {} }, null, { message: "RPC error" }), "uid", "cid", "approve_join_requests")).toBe(false);
    expect(await hasClanPermission(client(role, { permissions: { kick_member: ["leader"] } }), "uid", "cid", "kick_member")).toBe(role === "leader");
    expect(await hasClanPermission(client(role, { permissions: { kick_member: [] } }), "uid", "cid", "kick_member")).toBe(false);
  }
  expect(await hasClanPermission(client("officer", { permissions: {} }), "uid", "cid", "kick_member")).toBe(true);
});

test("R03 simulator is blocked in production even with an explicit flag", () => {
  expect(allowDevGameLink({ NODE_ENV: "production" })).toBe(false);
  expect(allowDevGameLink({ NODE_ENV: "development" })).toBe(true);
  expect(allowDevGameLink({ NODE_ENV: "production", DEV_GAME_LINK_SIMULATOR: "1", VERCEL_ENV: "production" })).toBe(false);
  expect(allowDevGameLink({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://mxkrfnzlgaxzdzcjbfkg.supabase.co" })).toBe(false);
  expect(allowDevGameLink({ NODE_ENV: "production", DEV_GAME_LINK_SIMULATOR: "1", VERCEL_ENV: "preview" })).toBe(true);
});

test("R07 only explicit timezone timestamps cross the server boundary", () => {
  expect(parseEventStart("2026-09-20T20:00:00+09:00")?.toISOString()).toBe("2026-09-20T11:00:00.000Z");
  expect(parseEventStart("2026-09-20T11:00:00.000Z")?.toISOString()).toBe("2026-09-20T11:00:00.000Z");
  expect(parseEventStart("2026-09-20T20:00")).toBeNull();
  expect(parseEventStart("2026-13-40T20:00:00Z")).toBeNull();
});
