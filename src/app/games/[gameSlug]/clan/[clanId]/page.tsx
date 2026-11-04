import { notFound, redirect } from "next/navigation";
import { ClanDashboard } from "@/components/main-clan/clan-dashboard";
import { ClanHero } from "@/components/main-clan/main-clan-shell";
import { ClanHeroBadges } from "@/components/main-clan/clan-badges";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { loadClanDashboard } from "@/lib/clan/load-clan-dashboard";
import { loadClanBadges } from "@/lib/clan/load-clan-badges";
import { ClanCommunityLinks } from "@/components/main-clan/clan-community-links";
import { ClanMemberWelcome } from "@/components/main-clan/clan-member-welcome";
import { getOwnInitializedRoles, getRequestClanWelcomeMembership } from "@/lib/clan/load-clan-welcome";

export default async function MainClanDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await getRequestClient();
  const user = await getRequestUser();
  if (!user) redirect("/sign-in");
  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) notFound();
  const [model, badgeCollection, membership, initializedRoles] = await Promise.all([
    loadClanDashboard(supabase, clanId, ctx.plan),
    loadClanBadges(clanId).catch(() => null),
    getRequestClanWelcomeMembership(clanId),
    gameSlug === "overwatch" ? getOwnInitializedRoles(clanId) : undefined,
  ]);
  if (!model) notFound();
  const { notice: noticeId } = await searchParams;
  const joinedAt = membership?.joined_at ?? membership?.created_at;
  let initialNotice: { title: string; content: string } | undefined;
  if (noticeId && /^[0-9a-f-]{36}$/i.test(noticeId)) {
    const { data } = await supabase.from("clan_notices").select("title,content").eq("clan_id", clanId).eq("id", noticeId).maybeSingle();
    if (data) initialNotice = data;
  }
  return (
    <>
      <ClanHero ctx={ctx} basePath={`/games/${gameSlug}/clan/${clanId}`} showLobbyAction={false} communityLinks={<div className="flex items-end gap-1">
        <ClanCommunityLinks links={model.communityLinks} discordEntryHref={model.discordConnected !== false ? `/games/${gameSlug}/clan/${clanId}/discord` : undefined} />
        {joinedAt && <ClanMemberWelcome clanId={clanId} clanName={ctx.clanName} basePath={`/games/${gameSlug}/clan/${clanId}`} model={{ communityLinks: model.communityLinks, discordConnected: model.discordConnected, rules: model.rules, notices: model.notices.filter(notice => notice.kind === "notice"), errors: model.errors }} joinedAt={joinedAt} initializedRoles={initializedRoles} initialOpen={false} />}
      </div>}>
        <ClanHeroBadges collection={badgeCollection} href={`/games/${gameSlug}/clan/${clanId}/badges`} />
      </ClanHero>
      <ClanDashboard
        model={model}
        gameSlug={gameSlug}
        clanId={clanId}
        isPremium={ctx.plan === "premium"}
        actorRole={ctx.role}
        initialNotice={initialNotice}
      />
    </>
  );
}
