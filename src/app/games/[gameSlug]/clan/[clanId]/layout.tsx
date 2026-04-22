import { redirect } from "next/navigation";
import { MainClanShell } from "@/components/main-clan/main-clan-shell";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { createClient } from "@/lib/supabase/server";

export default async function MainClanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/games/${gameSlug}/clan/${clanId}`);
  }

  const ctx = await loadMainClanContext(supabase, user.id, gameSlug, clanId);
  if (!ctx) {
    redirect(`/games/${gameSlug}/clan`);
  }

  void (await supabase.rpc("record_clan_activity", { p_clan_id: clanId }));

  const showDevPlanToggle =
    process.env.NODE_ENV === "development" ||
    process.env.DEV_CLAN_PLAN_TOGGLE === "1";

  return (
    <MainClanShell ctx={ctx} showDevPlanToggle={showDevPlanToggle}>
      {children}
    </MainClanShell>
  );
}
