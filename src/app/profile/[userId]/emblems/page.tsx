import { forbidden, redirect } from "next/navigation";
import ClanEmblemCasePage from "@/app/games/[gameSlug]/clan/[clanId]/emblems/page";
import { AccountShell } from "@/components/onboarding/account-shell";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { uuidPattern } from "@/lib/clan/board";
import { loadProfilePersonalEmblemCase } from "@/lib/personal-emblems/load-profile-case";
import { PersonalEmblemCase } from "@/components/personal-emblems/personal-emblem-case";

export const metadata = { title: "엠블럼 · ClanSync" };

export default async function ProfileEmblemsPage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ clan?: string | string[] }>;
}) {
  const [{ userId }, { clan: clanId }] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(userId) || (clanId !== undefined && (typeof clanId !== "string" || !uuidPattern.test(clanId)))) forbidden();
  const user = await getRequestUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/profile/${userId}/emblems${clanId ? "?clan=" + clanId : ""}`)}`);
  const client = await getRequestClient();
  if (!clanId) {
    const collection = await loadProfilePersonalEmblemCase(client, userId);
    if (!collection) forbidden();
    return <AccountShell context="엠블럼" profileHref={user.id === userId ? "/profile" : `/profile/${userId}`}>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-7"><section aria-label="개인 엠블럼">
        <PersonalEmblemCase key={userId + user.id} initialCollection={collection} />
      </section></main>
    </AccountShell>;
  }
  const { data: clan, error } = await client.from("clans").select("games!inner(slug)").eq("id", clanId).maybeSingle();
  if (error) throw new Error("엠블럼 출처를 확인하지 못했습니다.");
  const game = Array.isArray(clan?.games) ? clan.games[0] : clan?.games;
  if (!game) forbidden();
  return <AccountShell context="엠블럼" profileHref={user.id === userId ? "/profile" : `/profile/${userId}`}>
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-7">
      <ClanEmblemCasePage params={Promise.resolve({ gameSlug: game.slug, clanId })} searchParams={Promise.resolve({ player: userId })} />
    </main>
  </AccountShell>;
}
