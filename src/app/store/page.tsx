import { redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { PersonalStoreProducts } from "@/components/store/personal-store-products";
import { loadNamecard } from "@/lib/profile/load-namecard";
import { profileBattleTag } from "@/lib/game-auth/battle-tag";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import styles from "@/components/profile/profile.module.css";

export const metadata = { title: "개인 상점 · ClanSync" };

export default async function PersonalStorePage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in?next=/store");
  const db = await getRequestClient();
  const [namecard, catalog, memberships, profiles] = await Promise.all([
    loadNamecard(user.id),
    db.from("store_items").select("id,price_coins").eq("slug", "profile_entrance_fx").eq("pool_source", "personal").eq("is_active", true).maybeSingle(),
    db.from("clan_members").select("clan_id,clans!inner(subscription_tier,games!inner(slug))").eq("user_id", user.id).eq("status", "active").order("clan_id"),
    db.from("user_game_profiles").select("game_uid,battle_tag,riot_id,games!inner(slug)").eq("user_id", user.id).eq("is_verified", true),
  ]);
  const contexts = (memberships.data ?? []).flatMap(member => {
    const clan = Array.isArray(member.clans) ? member.clans[0] : member.clans;
    const game = clan && (Array.isArray(clan.games) ? clan.games[0] : clan.games);
    return game ? [{ clanId: member.clan_id, gameSlug: game.slug, premium: clan.subscription_tier === "premium" }] : [];
  });
  const context = contexts.find(item => item.premium) ?? contexts[0];
  const identities = (profiles.data ?? []).map(profile => {
    const game = Array.isArray(profile.games) ? profile.games[0] : profile.games;
    return { slug: game?.slug ?? "", name: game?.slug === "overwatch" ? profileBattleTag(profile) : profile.riot_id };
  }).sort((a, b) => (a.slug === "overwatch" ? -1 : b.slug === "overwatch" ? 1 : a.slug.localeCompare(b.slug)));
  const error = !namecard.ok ? namecard.error : catalog.error || memberships.error || profiles.error ? "구매 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요." : null;
  return <AccountShell context="개인 상점"><main className={styles.page}>
    {error || !namecard.ok ? <section className="min-h-96 rounded-xl border p-6" role="alert"><h1 className="text-xl font-bold">네임카드 상점</h1><p className="mt-4 text-sm text-destructive">{error}</p><a className="mt-4 inline-block text-primary underline" href="/store">다시 불러오기</a></section> : <PersonalStoreProducts key={user.id} state={namecard.state} displayName={identities.find(item => item.name)?.name ?? "Player"} offer={catalog.data ? {
      price: catalog.data.price_coins,
      eligible: context?.premium ?? false, gameSlug: context?.gameSlug, clanId: context?.clanId,
    } : null} />}
  </main></AccountShell>;
}
