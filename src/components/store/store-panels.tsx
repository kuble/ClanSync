"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Crown, Search, Shield, Store } from "lucide-react";
import { toast } from "sonner";
import { purchaseStoreItemAction } from "@/app/actions/clan-store-purchase";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";
import type { MvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { StorePremiumPlanDialog } from "@/components/main-clan/store-premium-plan-dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import styles from "./personal-store.module.css";
import clanStyles from "./clan-store.module.css";

export type ClanStoreItemVM = {
  slug: MvpStoreSlug; name_ko: string; asset_url: string | null; price_coins: number;
  pool_source: "clan" | "personal"; is_premium_only: boolean; purchased: boolean;
  canAttemptPurchase: boolean; disabledReason: string | null;
};

export function StorePanels({ gameSlug, clanId, clanName, iconUrl, bannerUrl, actorRole, planIsPremium, items, clanCoins, canManageClanPool }: {
  gameSlug: string; clanId: string; clanName: string; iconUrl: string | null; bannerUrl: string | null;
  actorRole: ClanMemberRole; planIsPremium: boolean; items: ClanStoreItemVM[]; clanCoins: number; canManageClanPool: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [selected, setSelected] = useState<ClanStoreItemVM | null>(null);
  const [preview, setPreview] = useState<ClanStoreItemVM | null>(null);
  const [filter, setFilter] = useState<"all" | "owned">("all");
  const [query, setQuery] = useState("");
  const shown = items.filter(item => item.pool_source === "clan" && (filter !== "owned" || item.purchased) && item.name_ko.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR")));
  const settingsPath = `/games/${gameSlug}/clan/${clanId}/manage?tab=appearance`;

  function buy() {
    if (!selected || pending) return;
    start(async () => {
      try {
        const result = await purchaseStoreItemAction(gameSlug, clanId, selected.slug);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("구매했습니다. 클랜 꾸미기에서 배너를 적용해 보세요.");
        setSelected(null); router.refresh();
      } catch { toast.error("구매 결과를 확인하지 못했습니다. 새로고침 후 보유 여부를 확인해 주세요."); }
    });
  }

  return <div className={cn(styles.shop, clanStyles.shop)}>
    <header className={clanStyles.header}>
      <h1><Store className="size-5 text-primary" aria-hidden />클랜 스토어</h1>
      <div className={clanStyles.balance} aria-label="보유 코인"><Coins size={16} aria-hidden /><span>클랜 코인</span><strong>{clanCoins.toLocaleString("ko-KR")}</strong></div>
    </header>
    <section className={styles.catalog} aria-label="클랜 꾸미기">
      <div className={cn(styles.filters, clanStyles.filters)}>
        <div className={clanStyles.filterTabs}><RubberSegment label="클랜 꾸미기 분류" labelPosition="hidden" options={[{ id: "all", label: "전체" }, { id: "owned", label: "보유" }]} value={filter} onChange={setFilter} /><span role="status">{shown.length}개 디자인</span></div>
        <div className={cn(styles.tools, clanStyles.tools)}><label className={styles.search}><Search size={16} aria-hidden /><input aria-label="디자인 검색" placeholder="디자인 검색" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      </div>
      <div className={cn(styles.grid, clanStyles.grid)} aria-label="클랜 꾸미기 상품" aria-busy={pending}>
        {shown.map(item => <article key={item.slug} className={cn(styles.product, clanStyles.product)} data-previewed={preview?.slug === item.slug || undefined} aria-label={item.name_ko}>
          <div className={styles.productHeading}><h3>{item.name_ko}</h3>{item.is_premium_only && <span className={styles.premium}><Crown size={12} aria-hidden />Premium</span>}{bannerUrl && item.asset_url === bannerUrl && <span className={styles.applied}><Check size={12} aria-hidden />적용 중</span>}</div>
          <button type="button" className={cn(styles.preview, clanStyles.preview)} aria-label={`${item.name_ko} 미리보기`} aria-pressed={preview?.slug === item.slug} onClick={() => setPreview(item)}>
            {item.asset_url && <Image src={item.asset_url} alt={`${item.name_ko} 배너 미리보기`} fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />}
            <span className={clanStyles.identity}><span className={clanStyles.icon}>{iconUrl ? <Image src={iconUrl} alt="" fill sizes="36px" unoptimized className="object-cover" /> : <Shield size={20} aria-hidden />}</span><span>{clanName}</span></span>
          </button>
          <div className={styles.productFooter}>
            <strong>{item.purchased ? "보유 중" : <><Coins size={14} aria-hidden />{item.price_coins.toLocaleString("ko-KR")}<small>코인</small></>}</strong>
            {item.purchased ? canManageClanPool ? <Link href={settingsPath} className={buttonVariants({ size: "sm", variant: "secondary" })} aria-label="구매 완료 · 설정하기">설정하기</Link> : <Button size="sm" variant="secondary" disabled>구매 완료</Button>
              : item.is_premium_only && !planIsPremium ? <Button size="sm" variant="outline" onClick={() => setPremiumOpen(true)}>플랜 비교 보기</Button>
              : <Button size="sm" title={item.disabledReason ?? undefined} disabled={pending || !item.canAttemptPurchase} onClick={() => setSelected(item)}>{item.canAttemptPurchase ? "구매" : canManageClanPool ? "코인 부족" : "권한 필요"}</Button>}
          </div>
        </article>)}
        {!shown.length && <div className={styles.empty}><Search size={28} aria-hidden /><h3>{query.trim() ? "검색 결과가 없습니다." : filter === "owned" ? "보유한 배너가 없습니다." : "표시할 디자인이 없습니다."}</h3><p>다른 분류나 검색어를 확인해 보세요.</p>{query.trim() && <Button variant="outline" onClick={() => setQuery("")}>검색 지우기</Button>}</div>}
      </div>
    </section>
    <StorePremiumPlanDialog open={premiumOpen} onOpenChange={setPremiumOpen} actorRole={actorRole} gameSlug={gameSlug} clanId={clanId} />
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent><DialogHeader><DialogTitle>{preview?.name_ko} 미리보기</DialogTitle><DialogDescription>우리 클랜에 적용될 배너를 확인하세요.</DialogDescription></DialogHeader>
      <div className={cn(clanStyles.preview, clanStyles.largePreview)}>{preview?.asset_url && <Image src={preview.asset_url} alt="" fill sizes="500px" className="object-cover" />}<span className={clanStyles.identity}><span className={clanStyles.icon}>{iconUrl ? <Image src={iconUrl} alt="" fill sizes="36px" unoptimized className="object-cover" /> : <Shield size={20} aria-hidden />}</span><span>{clanName}</span></span></div>
      <DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>닫기</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !pending) setSelected(null); }}><DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>꾸미기 구매</DialogTitle><DialogDescription>{selected?.name_ko}를 클랜 코인으로 구매합니다. 구매 후 적용할 수 있습니다.</DialogDescription></DialogHeader>
      <dl className={styles.checkout}><div><dt>클랜 코인 사용</dt><dd>{selected?.price_coins.toLocaleString("ko-KR")} 코인</dd></div><div><dt>구매 후 잔액</dt><dd>{(clanCoins - (selected?.price_coins ?? 0)).toLocaleString("ko-KR")} 코인</dd></div></dl>
      <p className="text-xs text-muted-foreground">구매 후 일반 환불은 지원되지 않습니다.</p>
      <DialogFooter><Button variant="ghost" disabled={pending} onClick={() => setSelected(null)}>취소</Button><Button disabled={pending} onClick={buy}>{pending ? "구매 중…" : "구매 확정"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
