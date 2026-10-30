import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadGameOnboarding } from "@/lib/onboarding/load-game-onboarding";
import { buildGameCardHref } from "@/lib/routing/game-card-router";

/** Community entry is deferred; follow the same onboarding route as game selection. */
export default async function MainGamePage({ params }: { params: Promise<{ gameSlug: string }> }) {
  const { gameSlug } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/games/${gameSlug}`)}`);
  const state = await loadGameOnboarding(client,user.id,gameSlug);
  if (!state) redirect("/games");
  redirect(buildGameCardHref("",{slug:gameSlug,auth:state.identityRegistered,clanStatus:state.clanStatus,clanId:state.clanId,clanName:state.clanName}));
}
