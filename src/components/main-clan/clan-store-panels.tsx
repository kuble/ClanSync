"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Coins,
  Crown,
  ImageIcon,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { purchaseStoreItemAction } from "@/app/actions/clan-store-purchase";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";
import type { MvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { StorePremiumPlanDialog } from "@/components/main-clan/store-premium-plan-dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  actorRole,
  planIsPremium,
  items,
  userCoins,
  clanCoins,
  canManageClanPool,
}: {
  gameSlug: string;
  clanId: string;
  actorRole: ClanMemberRole;
  planIsPremium: boolean;
  items: ClanStoreItemVM[];
  userCoins: number;
  clanCoins: number;
  canManageClanPool: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [selected, setSelected] = useState<ClanStoreItemVM | null>(null);
  const [pool, setPool] = useState("clan");

  function buy() {
    if (!selected || pending) return;
    start(async () => {
      const result = await purchaseStoreItemAction(
        gameSlug,
        clanId,
        selected.slug,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        selected.slug === "profile_entrance_fx"
          ? "구매가 완료되었습니다. 프로필에서 프레임을 선택해 주세요."
          : "구매가 완료되었습니다. 클랜 관리에서 배너를 설정해 주세요.",
      );
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3" aria-label="보유 코인">
        {[
          { key: "clan", label: "클랜 코인", balance: clanCoins, icon: Shield },
          {
            key: "personal",
            label: "내 코인",
            balance: userCoins,
            icon: UserRound,
          },
        ].map(({ key, label, balance, icon: Icon }) => (
          <div
            key={key}
            className={cn(
              "flex min-w-44 items-center gap-3 rounded-2xl border bg-card px-5 py-4",
              pool === key && "border-primary/40 bg-primary/5",
            )}
          >
            <Icon size={18} className="text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <strong className="flex items-center gap-1.5 text-xl font-bold tabular-nums">
                <Coins size={15} className="text-pro-gold" aria-hidden />
                {balance.toLocaleString("ko-KR")}
              </strong>
            </div>
          </div>
        ))}
      </div>
      <Tabs value={pool} onValueChange={(value) => setPool(String(value))}>
        <TabsList
          variant="line"
          className="mb-4 h-auto w-full justify-start gap-6 border-b p-0 pb-3"
        >
          <TabsTrigger value="clan" className="flex-none px-1">
            클랜 꾸미기
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex-none px-1">
            개인 꾸미기
          </TabsTrigger>
        </TabsList>
        {(["clan", "personal"] as const).map((category) => (
          <TabsContent key={category} value={category}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>
                {category === "clan"
                  ? "클랜원 모두가 함께 사용하는 꾸미기"
                  : "내 프로필에 특별함을 더하는 꾸미기"}
              </p>
              {category === "personal" ? (
                <Link href="/profile" className="text-primary hover:underline">
                  내 꾸미기 보기 →
                </Link>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items
                .filter((it) => it.pool_source === category)
                .map((it) => (
                  <article
                    key={it.slug}
                    className="flex flex-col overflow-hidden rounded-xl border bg-card"
                  >
                    <div
                      className={cn(
                        "relative flex h-36 items-center justify-center border-b bg-surface",
                        it.slug === "profile_entrance_fx"
                          ? "text-pro-gold"
                          : "text-primary",
                      )}
                    >
                      {it.slug === "clan_banner_slot" ? (
                        <div className="flex h-20 w-4/5 items-end gap-2 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 p-3">
                          <Shield className="size-9 rounded-lg border border-primary/30 p-1.5" />
                          <span className="mb-1 text-xs font-bold">
                            CLAN HOME
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border-2 border-pro-gold/60 bg-pro-gold/5 px-6 py-4">
                          <Sparkles size={24} />
                          <span className="text-sm font-semibold">PLAYER</span>
                        </div>
                      )}
                      {it.is_premium_only ? (
                        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-pro-gold/15 px-2 py-1 text-[10px] font-bold text-pro-gold">
                          <Crown size={11} />
                          Premium
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {category === "clan" ? (
                          <ImageIcon size={12} />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {category === "clan" ? "클랜 전용" : "개인 전용"} ·
                        꾸미기
                      </div>
                      <div>
                        <h3 className="text-base font-bold">{it.name_ko}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {it.slug === "clan_banner_slot"
                            ? "클랜의 분위기를 담은 이미지를 홈 배너로 설정하세요."
                            : "프로필 네임카드에 장착할 수 있는 프레임을 추가하세요."}
                        </p>
                      </div>
                      <strong className="mt-auto flex items-center gap-1.5 pt-2 text-lg tabular-nums">
                        <Coins size={16} className="text-pro-gold" />
                        {it.price_coins.toLocaleString("ko-KR")}
                        <span className="text-xs font-normal text-muted-foreground">
                          코인
                        </span>
                      </strong>
                      {it.disabledReason && !it.purchased ? (
                        <p className="text-xs text-muted-foreground">
                          {it.disabledReason}
                        </p>
                      ) : null}
                      {it.purchased &&
                      category === "clan" &&
                      !canManageClanPool ? (
                        <Button disabled variant="secondary">
                          <Check size={14} />
                          구매 완료
                        </Button>
                      ) : it.purchased ? (
                        <Link
                          className={cn(
                            buttonVariants({ variant: "secondary" }),
                            "w-full",
                          )}
                          href={
                            category === "clan"
                              ? `/games/${gameSlug}/clan/${clanId}/manage`
                              : "/profile"
                          }
                        >
                          <Check size={14} />
                          구매 완료 · 설정하기
                        </Link>
                      ) : it.is_premium_only && !planIsPremium ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setPremiumOpen(true)}
                        >
                          플랜 비교 보기
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          disabled={pending || !it.canAttemptPurchase}
                          onClick={() => setSelected(it)}
                        >
                          구매
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <StorePremiumPlanDialog
        open={premiumOpen}
        onOpenChange={setPremiumOpen}
        actorRole={actorRole}
        gameSlug={gameSlug}
        clanId={clanId}
      />
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>꾸미기 구매</DialogTitle>
            <DialogDescription>
              {selected?.name_ko}를 구매하시겠어요?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-surface p-4 text-sm">
            <p className="flex justify-between">
              <span>
                {selected?.pool_source === "clan"
                  ? "클랜 코인 사용"
                  : "개인 코인 사용"}
              </span>
              <strong>
                {selected?.price_coins.toLocaleString("ko-KR")} 코인
              </strong>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              구매 후 일반 환불은 지원되지 않습니다.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setSelected(null)}
            >
              취소
            </Button>
            <Button disabled={pending} onClick={buy}>
              {pending ? "구매 중…" : "구매 확정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
