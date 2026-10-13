import { notFound, redirect } from "next/navigation";
import { ClanDashboard } from "@/components/main-clan/clan-dashboard";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { loadClanDashboard } from "@/lib/clan/load-clan-dashboard";
import { loadClanBadges } from "@/lib/clan/load-clan-badges";

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
  const [model, badgeCollection] = await Promise.all([loadClanDashboard(supabase, clanId, ctx.plan), loadClanBadges(clanId).catch(() => null)]);
  if (!model) notFound();
  const { notice: noticeId } = await searchParams;
  let initialNotice: { title: string; content: string } | undefined;
  if (noticeId && /^[0-9a-f-]{36}$/i.test(noticeId)) {
    const { data } = await supabase.from("clan_notices").select("title,content").eq("clan_id", clanId).eq("id", noticeId).maybeSingle();
    if (data) initialNotice = data;
  }
  return (
    <ClanDashboard
      model={model}
      badgeCollection={badgeCollection}
      gameSlug={gameSlug}
      clanId={clanId}
      isPremium={ctx.plan === "premium"}
      actorRole={ctx.role}
      initialNotice={initialNotice}
    />
  );
}
