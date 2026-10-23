import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { ProfileRoomVisit } from "@/components/profile/profile-room-visit";
import { createClient } from "@/lib/supabase/server";
import type { PlayerProfileVisit } from "@/lib/profile/visibility";
import styles from "@/components/profile/profile.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "플레이어 미니룸 · ClanSync", robots: { index: false, follow: false } };

export default async function PlayerRoomPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/profile/${userId}`)}`);
  const { data, error } = await supabase.rpc("read_player_profile", { p_user_id: userId });
  if (error) throw new Error("플레이어의 미니룸을 불러오지 못했습니다.");
  const profile = data as PlayerProfileVisit | null;
  return <AccountShell context="프로필"><main className={styles.page}>
    <div className={styles.visitHeading}><h1>3D 미니룸</h1><Link href="/profile">내 프로필</Link></div>
    {profile ? <div className={styles.profileHero} data-testid="profile-hero">
      <ProfileIdentity readOnly userId={profile.userId} intro={profile.intro ?? ""} memberships={profile.memberships} games={profile.games} />
      <ProfileRoomVisit housing={profile.housing} />
    </div> : <section className={styles.empty}><h2>방문할 수 없는 미니룸입니다</h2><p>공개하지 않았거나 더 이상 이용할 수 없는 프로필입니다.</p></section>}
  </main></AccountShell>;
}
