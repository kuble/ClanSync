import { forbidden, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOwnedPersonalEmblemCase } from "@/lib/personal-emblems/load-owned-case";
import { PersonalEmblemCase } from "@/components/personal-emblems/personal-emblem-case";
import { AccountShell } from "@/components/onboarding/account-shell";
import { uuidPattern } from "@/lib/clan/board";

export const metadata = { title: "엠블럼 케이스 · ClanSync" };
export default async function MyEmblemsPage({ searchParams }: { searchParams: Promise<{ clan?: string | string[] }> }) {
  const query = await searchParams;
  if (query.clan !== undefined && (typeof query.clan !== "string" || !uuidPattern.test(query.clan))) forbidden();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/sign-in?next=/profile/emblems");
  const collection = await loadOwnedPersonalEmblemCase(client, query.clan);
  if (!collection) forbidden();
  return <AccountShell context="엠블럼"><main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-7" aria-label="개인 엠블럼">
    <PersonalEmblemCase key={user.id + collection.clanId} initialCollection={collection} />
  </main></AccountShell>;
}
