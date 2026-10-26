import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseBattleTag } from "@/lib/game-auth/battle-tag";
import { namecardAppearance } from "@/lib/profile/namecard";
import type { PlayerProfileVisit } from "@/lib/profile/visibility";
import styles from "@/components/profile/profile.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "플레이어 프로필 · ClanSync", robots: { index: false, follow: false } };

export default async function PlayerProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/profile/${userId}`)}`);
  const { data, error } = await supabase.rpc("read_player_profile", { p_user_id: userId });
  if (error) throw new Error("플레이어의 프로필을 불러오지 못했습니다.");
  const profile = data as PlayerProfileVisit | null;
  // Read only public appearance and game IDs after the authenticated profile access check.
  const service: SupabaseClient<Database> = createServiceRoleClient();
  const publicDetails = profile ? await Promise.all([
    service.from("nameplate_options").select("id,category,code,name_ko,unlock_source,price_coins").eq("is_active", true),
    service.from("user_namecard_selections").select("category,option_id").eq("user_id", profile.userId),
    service.from("user_game_profiles").select("battle_tag,game_uid,riot_id,is_verified,games(slug,name_ko)").eq("user_id", profile.userId),
  ]) : null;
  if (publicDetails?.some(result => result.error)) throw new Error("플레이어의 네임카드를 불러오지 못했습니다.");
  const [catalog, selections, linkedGames] = publicDetails ?? [];
  const appearance = namecardAppearance(catalog?.data ?? [], selections?.data ?? []);
  const games = (linkedGames?.data ?? []).flatMap(game => game.games ? [{
    gameSlug: game.games.slug, gameName: game.games.name_ko,
    accountId: game.is_verified ? (game.games.slug === "overwatch" ? parseBattleTag(game.battle_tag || game.game_uid) : ["valorant", "lol"].includes(game.games.slug) ? game.riot_id : null) : null,
  }] : []);
  return <AccountShell context="프로필"><main className={styles.page}>
    <div className={styles.visitHeading}><h1>플레이어 프로필</h1><Link href="/profile">내 프로필</Link></div>
    {profile ? <div className={styles.profileHero} data-testid="profile-hero">
      <ProfileIdentity readOnly userId={profile.userId} intro={profile.intro ?? ""} memberships={profile.memberships} games={games} publicAppearance={appearance} />
    </div> : <section className={styles.empty}><h2>방문할 수 없는 프로필입니다</h2><p>존재하지 않거나 더 이상 이용할 수 없는 프로필입니다.</p></section>}
  </main></AccountShell>;
}
