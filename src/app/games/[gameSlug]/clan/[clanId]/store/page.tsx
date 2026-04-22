import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import {
  ClanStorePanels,
  type ClanStoreItemVM,
} from "@/components/main-clan/clan-store-panels";
import { MVP_STORE_SLUGS } from "@/lib/store/mvp-store-slugs";
import { createClient } from "@/lib/supabase/server";

export default async function ClanStorePage({
  params,
}: {
  params: Promise<{ gameSlug: string; clanId: string }>;
}) {
  const { gameSlug, clanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx =
    user != null
      ? await loadMainClanContext(supabase, user.id, gameSlug, clanId)
      : null;

  let userCoins = 0;
  let clanCoins = 0;
  let canManageClanPool = false;

  if (user) {
    const { data: urow } = await supabase
      .from("users")
      .select("coin_balance")
      .eq("id", user.id)
      .maybeSingle();
    userCoins = urow?.coin_balance ?? 0;

    const { data: crow } = await supabase
      .from("clans")
      .select("coin_balance")
      .eq("id", clanId)
      .maybeSingle();
    clanCoins = crow?.coin_balance ?? 0;

    canManageClanPool = await hasClanPermission(
      supabase,
      user.id,
      clanId,
      "manage_clan_pool",
    );
  }

  const premium = ctx?.plan === "premium";

  const { data: catalogRows } = await supabase
    .from("store_items")
    .select("id, slug, name_ko, price_coins, pool_source, is_premium_only")
    .eq("is_active", true)
    .in("slug", [...MVP_STORE_SLUGS]);

  const bySlug = new Map(
    (catalogRows ?? []).map((r) => [r.slug as string, r] as const),
  );

  let personalItemIds: string[] = [];
  let clanItemIds: string[] = [];

  if (user) {
    const { data: pPersonal } = await supabase
      .from("purchases")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("pool_source", "personal")
      .is("voided_at", null);

    const { data: pClan } = await supabase
      .from("purchases")
      .select("item_id")
      .eq("clan_id", clanId)
      .eq("pool_source", "clan")
      .is("voided_at", null);

    personalItemIds = (pPersonal ?? []).map((r) => r.item_id as string);
    clanItemIds = (pClan ?? []).map((r) => r.item_id as string);
  }

  const personalSet = new Set(personalItemIds);
  const clanSet = new Set(clanItemIds);

  const items: ClanStoreItemVM[] = [];

  for (const slug of MVP_STORE_SLUGS) {
    const row = bySlug.get(slug);
    if (!row) continue;

    const id = row.id as string;
    const price = row.price_coins as number;
    const pool = row.pool_source as "clan" | "personal";
    const isPrem = row.is_premium_only === true;

    const purchased =
      pool === "clan" ? clanSet.has(id) : personalSet.has(id);

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
      <div>
        <h2 className="text-lg font-semibold tracking-tight">스토어</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          코인으로 클랜·개인 꾸미기를 구매합니다. 환불은 제공하지 않습니다
          (D-STORE-03).
        </p>
        {user ? (
          <p className="mt-3 text-sm font-medium tabular-nums">
            내 코인: {userCoins.toLocaleString("ko-KR")} · 클랜 풀:{" "}
            {clanCoins.toLocaleString("ko-KR")}
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ClanStorePanels gameSlug={gameSlug} clanId={clanId} items={items} />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          진열 중인 상품이 없습니다. 마이그레이션·시드를 확인해 주세요.
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        거래 내역은 <code className="text-xs">coin_transactions</code> 원장에
        기록됩니다. 에셋 실제 적용(배너·입장 효과)은 후속 UI와 연결합니다.
      </p>
    </div>
  );
}
