import { redirect } from "next/navigation";
import { after } from "next/server";
import { MainClanShell } from "@/components/main-clan/main-clan-shell";
import { loadClanInAppNotifications } from "@/lib/clan/load-clan-inapp-notifications";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";

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

  const [ctx, inAppNotifications] = await Promise.all([
    getRequestMainClanContext(gameSlug, clanId),
    loadClanInAppNotifications(supabase, clanId),
  ]);
  if (!ctx) {
    redirect(`/games/${gameSlug}/clan`);
  }

  // Capture the authenticated client during render; after() cannot read cookies here.
  after(async () => {
    const { error } = await supabase.rpc("record_clan_activity", {
      p_clan_id: clanId,
    });
    if (error) console.error("record_clan_activity", error.message);
  });

  const showDevPlanToggle =
    process.env.NODE_ENV === "development" ||
    process.env.DEV_CLAN_PLAN_TOGGLE === "1";

  return (
    <MainClanShell
      ctx={ctx}
      showDevPlanToggle={showDevPlanToggle}
      inAppNotifications={inAppNotifications}
    >
      {children}
    </MainClanShell>
  );
}
