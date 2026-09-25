import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasRequestClanPermission } from "@/lib/clan/request-clan-access";
import {
  ClanStorePanels,
  type ClanStoreItemVM,
} from "@/components/main-clan/clan-store-panels";
import { ClanStoreCoinHistory } from "@/components/main-clan/clan-store-coin-history";
import { MVP_STORE_SLUGS } from "@/lib/store/mvp-store-slugs";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";

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

  const [userBalance, clanBalance, canManageClanPool, catalog, personalPurchases, clanPurchases] = await Promise.all([
    supabase
      .from("users")
      .select("coin_balance")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("clans")
      .select("coin_balance")
      .eq("id", clanId)
      .maybeSingle(),
    hasRequestClanPermission(clanId, "manage_clan_pool"),
    supabase
      .from("store_items")
      .select("id, slug, name_ko, price_coins, pool_source, is_premium_only")
      .eq("is_active", true)
      .in("slug", [...MVP_STORE_SLUGS]),
    supabase
      .from("purchases")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("pool_source", "personal")
      .is("voided_at", null),
    supabase
      .from("purchases")
      .select("item_id")
      .eq("clan_id", clanId)
      .eq("pool_source", "clan")
      .is("voided_at", null),
  ]);
  const userCoins = userBalance.data?.coin_balance ?? 0;
  const clanCoins = clanBalance.data?.coin_balance ?? 0;
  const premium = ctx.plan === "premium";
  const bySlug = new Map((catalog.data ?? []).map((row) => [row.slug, row] as const));
  const personalSet = new Set((personalPurchases.data ?? []).map((row) => row.item_id));
  const clanSet = new Set((clanPurchases.data ?? []).map((row) => row.item_id));

  const items: ClanStoreItemVM[] = [];

  for (const slug of MVP_STORE_SLUGS) {
    const row = bySlug.get(slug);
    if (!row) continue;

    const id = row.id as string;
    const price = row.price_coins as number;
    const pool = row.pool_source as "clan" | "personal";
    const isPrem = row.is_premium_only === true;

    const purchased = pool === "clan" ? clanSet.has(id) : personalSet.has(id);

    let canAttemptPurchase = false;
    let disabledReason: string | null = null;

    if (purchased) {
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
    } else {
      if (userCoins < price) {
        disabledReason = "개인 코인이 부족합니다.";
      } else {
        canAttemptPurchase = true;
      }
    }

    items.push({
      slug,
      name_ko: row.name_ko as string,
      price_coins: price,
      pool_source: pool,
      is_premium_only: isPrem,
      purchased,
      canAttemptPurchase,
      disabledReason,
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Store size={21} aria-hidden />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">클랜 스토어</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            함께 모은 코인으로 클랜과 나만의 공간을 꾸며보세요.
          </p>
        </div>
      </header>

      {items.length > 0 ? (
        <ClanStorePanels
          gameSlug={gameSlug}
          clanId={clanId}
          actorRole={ctx?.role ?? "member"}
          planIsPremium={premium}
          items={items}
          userCoins={userCoins}
          clanCoins={clanCoins}
          canManageClanPool={canManageClanPool}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          새로운 상품을 준비하고 있어요.
        </p>
      )}

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
              href={`/games/${gameSlug}/clan/${clanId}/manage`}
            >
              클랜 관리
            </Link>
            에서, 개인 프레임은{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/profile"
            >
              프로필 꾸미기
            </Link>
            에서 설정할 수 있습니다.
          </p>
        </div>
      </details>
    </div>
  );
}
