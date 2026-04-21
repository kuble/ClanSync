import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseIp(raw: string | null): string {
  const v = raw?.trim();
  if (!v) return "127.0.0.1";
  if (v.startsWith("::ffff:")) return v.slice(7);
  return v;
}

export async function getRequestIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip");
  return parseIp(ip);
}

export async function isLoginLocked(
  email: string,
  ip: string,
): Promise<boolean> {
  const svc = createServiceRoleClient();
  const { data } = await svc
    .from("auth_login_lockouts")
    .select("locked_until")
    .eq("email", normalizeEmail(email))
    .eq("ip", ip)
    .maybeSingle();

  const until = data?.locked_until ? new Date(data.locked_until) : null;
  if (!until) return false;
  return until.getTime() > Date.now();
}

export async function recordLockedAttempt(
  email: string,
  ip: string,
  userAgent: string | null,
): Promise<void> {
  const svc = createServiceRoleClient();
  await svc.from("auth_failed_logins").insert({
    email: normalizeEmail(email),
    ip,
    user_agent: userAgent,
    reason: "locked",
  });
}

export async function recordFailedPasswordAttempt(
  email: string,
  ip: string,
  userAgent: string | null,
): Promise<void> {
  const norm = normalizeEmail(email);
  const svc = createServiceRoleClient();
  await svc.from("auth_failed_logins").insert({
    email: norm,
    ip,
    user_agent: userAgent,
    reason: "invalid_password",
  });

  const { data: row } = await svc
    .from("auth_login_lockouts")
    .select("consecutive_failures")
    .eq("email", norm)
    .eq("ip", ip)
    .maybeSingle();

  const prev = row?.consecutive_failures ?? 0;
  const next = prev + 1;
  let lockedUntil: string | null = null;
  if (next >= MAX_FAILURES) {
    lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
  }

  await svc.from("auth_login_lockouts").upsert(
    {
      email: norm,
      ip,
      consecutive_failures: next,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email,ip" },
  );
}

export async function clearLoginLockout(email: string, ip: string): Promise<void> {
  const svc = createServiceRoleClient();
  await svc.from("auth_login_lockouts").upsert(
    {
      email: normalizeEmail(email),
      ip,
      consecutive_failures: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email,ip" },
  );
}
