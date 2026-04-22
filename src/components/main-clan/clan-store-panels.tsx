"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { purchaseStoreItemAction } from "@/app/actions/clan-store-purchase";
import type { MvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ClanStoreItemVM = {
  slug: MvpStoreSlug;
  name_ko: string;
  price_coins: number;
  pool_source: "clan" | "personal";
  is_premium_only: boolean;
  purchased: boolean;
  canAttemptPurchase: boolean;
  disabledReason: string | null;
};

export function ClanStorePanels({
  gameSlug,
  clanId,
  items,
}: {
  gameSlug: string;
  clanId: string;
  items: ClanStoreItemVM[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onBuy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const slug = String(fd.get("item_slug") ?? "") as MvpStoreSlug;
    start(async () => {
      const r = await purchaseStoreItemAction(gameSlug, clanId, slug);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("구매가 완료되었습니다.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((it) => (
        <Card
          key={it.slug}
          className={
            it.is_premium_only && !it.canAttemptPurchase && !it.purchased
              ? "border-muted opacity-90"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="text-base">{it.name_ko}</CardTitle>
            <CardDescription>
              {it.pool_source === "clan"
                ? "클랜 풀 코인으로 구매합니다."
                : "개인 코인으로 구매합니다."}
              {it.is_premium_only ? " · Premium 클랜 전용" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm tabular-nums">
              {it.price_coins.toLocaleString("ko-KR")} 코인
            </p>
            {it.purchased ? (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                구매 완료
              </p>
            ) : it.disabledReason ? (
              <p className="text-muted-foreground text-xs">{it.disabledReason}</p>
            ) : null}
          </CardContent>
          <CardFooter>
            {it.purchased ? (
              <Button type="button" variant="secondary" disabled>
                구매됨
              </Button>
            ) : (
              <form onSubmit={onBuy} className="w-full">
                <input type="hidden" name="item_slug" value={it.slug} />
                <Button
                  type="submit"
                  variant={it.is_premium_only ? "default" : "secondary"}
                  className="w-full sm:w-auto"
                  disabled={pending || !it.canAttemptPurchase}
                >
                  구매
                </Button>
              </form>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
