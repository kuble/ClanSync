import { ClanEmojiProvider } from "@/components/main-clan/clan-emoji-content";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ClanNamecardsProvider } from "@/components/profile/clan-namecards";
import type { ClanNamecards } from "@/lib/profile/namecard";
import { MainClanShell } from "@/components/main-clan/main-clan-shell";
import { loadClanInAppNotifications } from "@/lib/clan/load-clan-inapp-notifications";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { getOwnInitializedRoles, getRequestClanWelcomeMembership, loadClanWelcomeContent } from "@/lib/clan/load-clan-welcome";
import { ClanMemberWelcome } from "@/components/main-clan/clan-member-welcome";

export default async function MainClanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await getRequestClient();
  const user = await getRequestUser();

  if (!user) {
    redirect(`/sign-in?next=/games/${gameSlug}/clan/${clanId}`);
  }

  const [ctx, inAppNotifications, namecards, emojis, membership] = await Promise.all([
    getRequestMainClanContext(gameSlug, clanId),
    loadClanInAppNotifications(supabase, clanId),
    supabase.rpc("get_clan_namecards", { p_clan_id: clanId }),
    supabase.from("clan_emojis").select("id,name").eq("clan_id",clanId).order("created_at"),
    getRequestClanWelcomeMembership(clanId),
  ]);
  if (!ctx) {
    redirect(`/games/${gameSlug}/clan`);
  }
  const cards = (namecards.data ?? {}) as ClanNamecards;
  const joinedAt = membership?.joined_at ?? membership?.created_at;
  const needsWelcome = ctx.role === "member" && !!joinedAt && (!membership?.welcome_completed_at || Date.parse(membership.welcome_completed_at) < Date.parse(joinedAt));
  const [welcomeContent, initializedRoles] = await Promise.all([
    needsWelcome ? loadClanWelcomeContent(clanId) : null,
    needsWelcome && gameSlug === "overwatch" ? getOwnInitializedRoles(clanId) : undefined,
  ]);

  // Capture the authenticated client during render; after() cannot read cookies here.
  after(async () => {
    const { error } = await supabase.rpc("record_clan_activity", {
      p_clan_id: clanId,
    });
    if (error) console.error("record_clan_activity", error.message);
  });

  return (
    <MainClanShell
      ctx={ctx}
      inAppNotifications={inAppNotifications}
    >
      {welcomeContent && joinedAt && <ClanMemberWelcome key={user.id + joinedAt} clanId={clanId} clanName={ctx.clanName} basePath={`/games/${gameSlug}/clan/${clanId}`} model={welcomeContent} joinedAt={joinedAt} initializedRoles={initializedRoles} initialOpen showTrigger={false} />}
      <ClanEmojiProvider key={user.id+clanId} clanId={clanId} gameSlug={gameSlug} emojis={emojis.data??[]}><ClanNamecardsProvider recordPath={`/games/${gameSlug}/clan/${clanId}/stats`} cards={cards}>{children}</ClanNamecardsProvider></ClanEmojiProvider>
    </MainClanShell>
  );
}
