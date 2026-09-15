import { notFound, redirect } from "next/navigation";
import { ClanDashboard } from "@/components/main-clan/clan-dashboard";
import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { loadClanDashboard } from "@/lib/clan/load-clan-dashboard";

export default async function MainClanDashboardPage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const ctx = await loadMainClanContext(supabase, user.id, gameSlug, clanId);
  if (!ctx) notFound();
  const model = await loadClanDashboard(supabase, clanId, ctx.plan);
  if (!model) notFound();
  return (
    <ClanDashboard
      model={model}
      gameSlug={gameSlug}
      clanId={clanId}
      isPremium={ctx.plan === "premium"}
      actorRole={ctx.role}
    />
  );
}
