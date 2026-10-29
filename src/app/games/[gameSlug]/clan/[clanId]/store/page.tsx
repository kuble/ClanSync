import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import {
  StorePanels,
  type ClanStoreItemVM,
} from "@/components/store/store-panels";
import { ClanStoreCoinHistory } from "@/components/main-clan/clan-store-coin-history";
import { MVP_STORE_SLUGS, isMvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";
import { BANNER_RARITIES } from "@/lib/clan/banner-catalog";
import { isRepeatableClanProduct } from "@/lib/clan/cosmetics";

export default async function ClanStorePage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await getRequestClient();
  const user = await getRequestUser();
  if (!user) redirect(`/sign-in?next=/games/${gameSlug}/clan/${clanId}/store`);
  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) redirect(`/games/${gameSlug}/clan`);

  const [clanBalance, canManageClanPool, catalog, clanPurchases] = await Promise.all([
    supabase
      .from("clans")
      .select("coin_balance")
      .eq("id", clanId)
      .maybeSingle(),
    hasRequestClanPermission(clanId, "manage_clan_pool"),
    supabase
      .from("store_items")
      .select("id, slug, name_ko, price_coins, pool_source, is_premium_only, asset_url, rarity")
      .eq("is_active", true)
      .eq("pool_source", "clan")
      .in("slug", [...MVP_STORE_SLUGS]).order("released_at", { ascending: false }).order("slug"),
    supabase
      .from("purchases")
      .select("item_id")
      .eq("clan_id", clanId)
      .eq("pool_source", "clan")
      .is("voided_at", null),
  ]);
  const clanCoins = clanBalance.data?.coin_balance ?? 0;
  const premium = ctx.plan === "premium";
  const clanSet = new Set((clanPurchases.data ?? []).map((row) => row.item_id));

  const items: ClanStoreItemVM[] = [];

  for (const row of catalog.data ?? []) {
    const slug = row.slug;
    if (!isMvpStoreSlug(slug)) continue;

    const id = row.id as string;
    const price = row.price_coins as number;
    const pool = row.pool_source as "clan" | "personal";
    const isPrem = row.is_premium_only === true;

    const purchased = clanSet.has(id);

    let canAttemptPurchase = false;
    let disabledReason: string | null = null;

    if (purchased && !isRepeatableClanProduct(slug)) {
      disabledReason = null;
    } else if (isPrem && !premium) {
      disabledReason = "Premium 클랜에서만 구매할 수 있습니다.";
    } else if (pool === "clan") {
      if (!canManageClanPool) {
        disabledReason = "클랜 코인 지출 권한이 없습니다.";
      } else if (clanCoins < price) {
        disabledReason = "클랜 코인이 부족합니다.";
      } else {
        canAttemptPurchase = true;
      }
    }

    items.push({
      slug,
      name_ko: row.name_ko as string,
      asset_url: row.asset_url,
      price_coins: price,
      pool_source: pool,
      is_premium_only: isPrem,
      purchased,
      canAttemptPurchase,
      disabledReason,
      rarity: row.rarity && row.rarity in BANNER_RARITIES ? row.rarity as keyof typeof BANNER_RARITIES : null,
    });
  }

  return (
    <div className="space-y-8">

        <StorePanels
          key={user.id}
          ctx={ctx}
          items={items}
          clanCoins={clanCoins}
          canManageClanPool={canManageClanPool}
        />
      {user ? (
        <ClanStoreCoinHistory
          clanId={clanId}
          showClanPool={
            ctx != null && (ctx.role === "leader" || ctx.role === "officer")
          }
        />
      ) : null}

      <details className="rounded-2xl border bg-card p-5 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground">
          구매·코인 이용 안내
        </summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            클랜 코인과 개인 코인은 각각 적립·사용되며 서로 이전할 수 없습니다.
            구매 후 일반 환불은 지원되지 않습니다.
          </p>
          <p>
            구매한 클랜 배너는{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href={`/games/${gameSlug}/clan/${clanId}/manage?tab=appearance`}
            >
              클랜 관리
            </Link>
            에서 설정할 수 있습니다.
          </p>
        </div>
      </details>
    </div>
  );
}
