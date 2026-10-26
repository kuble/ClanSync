import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlayerProfileVisit } from "@/lib/profile/visibility";

export const dynamic = "force-dynamic";
export const metadata = { title: "플레이어 개인 기록 · ClanSync", robots: { index: false, follow: false } };

/** Old profile links resolve to the existing clan record, without a separate profile screen. */
export default async function PlayerProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(userId)) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/profile/${userId}`)}`);
  const [{ data, error }, memberships] = await Promise.all([
    db.rpc("read_player_profile", { p_user_id: userId }),
    db.rpc("read_player_profile", { p_user_id: user.id }),
  ]);
  if (error || memberships.error) throw new Error("플레이어의 개인 기록을 불러오지 못했습니다.");
  const profile = data as PlayerProfileVisit | null;
  if (!profile) notFound();
  const viewer = memberships.data as PlayerProfileVisit | null;
  const common = profile.memberships.find(membership => viewer?.memberships.some(own => own.clanId === membership.clanId));
  if (common) redirect(`/games/${common.gameSlug}/clan/${common.clanId}/stats?player=${userId}`);
  redirect(user.id === userId ? "/profile" : `/profile/${userId}/emblems`);
}
