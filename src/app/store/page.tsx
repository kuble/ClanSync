import { redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { StorePanels, type ClanStoreItemVM } from "@/components/store/store-panels";
import { loadHousingState } from "@/lib/housing/load";
import { loadNamecard } from "@/lib/profile/load-namecard";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { MVP_STORE_SLUGS } from "@/lib/store/mvp-store-slugs";
import styles from "@/components/profile/profile.module.css";

export const metadata = { title: "개인 상점 · ClanSync" };

export default async function PersonalStorePage() {
  const user = await getRequestUser();
  if (!user) redirect("/sign-in?next=/store");
  const db = await getRequestClient();
  const [housing, namecard, balance, catalog, purchases, memberships] = await Promise.all([
    loadHousingState(), loadNamecard(user.id),
    db.from("users").select("coin_balance").eq("id", user.id).single(),
    db.from("store_items").select("id,slug,name_ko,price_coins,is_premium_only").eq("pool_source", "personal").eq("is_active", true).in("slug", [...MVP_STORE_SLUGS]),
    db.from("purchases").select("item_id").eq("user_id", user.id).eq("pool_source", "personal").is("voided_at", null),
    db.from("clan_members").select("clan_id,role,clans!inner(subscription_tier,games!inner(slug))").eq("user_id", user.id).eq("status", "active").order("clan_id"),
  ]);
  // The legacy Premium frame keeps its existing entitlement; no clan selection is needed.
  const contexts = (memberships.data ?? []).flatMap((member) => {
    const clan = Array.isArray(member.clans) ? member.clans[0] : member.clans;
    const game = clan && (Array.isArray(clan.games) ? clan.games[0] : clan.games);
    return game ? [{ clanId: member.clan_id, gameSlug: game.slug, actorRole: member.role, premium: clan.subscription_tier === "premium" }] : [];
  });
  const context = contexts.find((item) => item.premium) ?? contexts[0];
  const coins = balance.data?.coin_balance ?? (housing.ok ? housing.state.coinBalance : namecard.ok ? namecard.state.coinBalance : 0);
  const owned = new Set((purchases.data ?? []).map((item) => item.item_id));
  const items: ClanStoreItemVM[] = (catalog.data ?? []).flatMap((item) => {
    const slug = MVP_STORE_SLUGS.find((slug) => slug === item.slug);
    if (!slug) return [];
    const purchased = owned.has(item.id);
    const disabledReason = purchased ? null : !context || (item.is_premium_only && !context.premium)
      ? "Premium 클랜에 가입하면 구매할 수 있습니다." : coins < item.price_coins ? "개인 코인이 부족합니다." : null;
    return [{ slug, name_ko: item.name_ko, price_coins: item.price_coins, pool_source: "personal", is_premium_only: item.is_premium_only, purchased, canAttemptPurchase: !purchased && !disabledReason, disabledReason }];
  });
  return <AccountShell context="개인 상점"><main className={styles.page}>
    <header className="mb-8"><h1 className="text-2xl font-bold">나를 꾸미는 상점</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">모든 게임과 클랜에서 모은 개인 코인으로 가구와 네임카드를 꾸며보세요.</p></header>
    {(balance.error || catalog.error || purchases.error || memberships.error) && <p role="alert" className="mb-5 text-sm text-destructive">일부 구매 정보를 불러오지 못했습니다. 새로고침 후 확인해 주세요.</p>}
    <StorePanels key={user.id} pool="personal" {...context} planIsPremium={context?.premium ?? false} items={items} userCoins={coins} clanCoins={0} canManageClanPool={false} housing={housing} namecard={namecard} />
    <p className="mt-8 text-xs leading-relaxed text-muted-foreground">구매한 아이템은 계정에 영구 보관됩니다. 프로필에서 가구를 배치하거나 칭호·프레임을 장착할 수 있습니다. 클랜 코인은 클랜 상점에서 별도로 사용합니다.</p>
  </main></AccountShell>;
}
