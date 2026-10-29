"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Crown, Search, Shield, Store } from "lucide-react";
import { toast } from "sonner";
import { purchaseStoreItemAction } from "@/app/actions/clan-store-purchase";
import type { MainClanContext } from "@/lib/clan/load-main-clan-context";
import { ClanHero } from "@/components/main-clan/main-clan-shell";
import { clanProductKind } from "@/lib/clan/cosmetics";
import { ClanProductPreview } from "./clan-product-preview";
import type { MvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { StorePremiumPlanDialog } from "@/components/main-clan/store-premium-plan-dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import styles from "./personal-store.module.css";
import clanStyles from "./clan-store.module.css";
import { BANNER_RARITIES, clanBannerUrl, readClanBannerUrl, sameClanBannerPattern } from "@/lib/clan/banner-catalog";
import type { CosmeticColorPresetId } from "@/lib/cosmetics/color-presets";
import { ClanBannerImage } from "@/components/cosmetics/clan-banner-image";
import { CosmeticColorPicker } from "@/components/cosmetics/cosmetic-color-picker";

export type ClanStoreItemVM = {
  slug: MvpStoreSlug; name_ko: string; asset_url: string | null; price_coins: number;
  pool_source: "clan" | "personal"; is_premium_only: boolean; purchased: boolean;
  canAttemptPurchase: boolean; disabledReason: string | null;
  rarity?: keyof typeof BANNER_RARITIES | null;
};

export function StorePanels({ ctx, items, clanCoins, canManageClanPool }: {
  ctx: MainClanContext; items: ClanStoreItemVM[]; clanCoins: number; canManageClanPool: boolean;
}) {
  const { gameSlug, clanId, clanName, iconUrl, bannerUrl, role: actorRole } = ctx;
  const planIsPremium = ctx.plan === "premium";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [selected, setSelected] = useState<ClanStoreItemVM | null>(null);
  const [preview, setPreview] = useState<ClanStoreItemVM | null>(null);
  const [filter, setFilter] = useState<"owned" | "banner" | "emojis" | "photos">("banner");
  const [bannerView, setBannerView] = useState<"applied" | "original">("applied");
  const [query, setQuery] = useState("");
  const [itemPalettes, setItemPalettes] = useState<Partial<Record<MvpStoreSlug, CosmeticColorPresetId>>>({});
  function paletteFor(item: ClanStoreItemVM): CosmeticColorPresetId {
    return itemPalettes[item.slug] ?? (sameClanBannerPattern(item.asset_url, bannerUrl) ? readClanBannerUrl(bannerUrl)?.paletteId : undefined) ?? "graphite";
  }
  function previewUrlFor(item: ClanStoreItemVM) {
    const selection = readClanBannerUrl(item.asset_url);
    return selection ? clanBannerUrl({ ...selection, paletteId: paletteFor(item) }) : item.asset_url;
  }
  function setPalette(item: ClanStoreItemVM, paletteId: CosmeticColorPresetId) {
    setItemPalettes(current => ({ ...current, [item.slug]: paletteId }));
  }
  const previewSelection = readClanBannerUrl(preview?.asset_url);
  const previewUrl = preview ? previewUrlFor(preview) : null;
  const search = query.trim().toLocaleLowerCase("ko-KR");
  const shown = items.filter(item => {
    const kind = clanProductKind(item.slug);
    const inCategory = filter === "owned" ? item.purchased
      : filter === "photos" ? kind === "frames" || kind === "stickers" : kind === filter;
    return item.pool_source === "clan" && inCategory && item.name_ko.toLocaleLowerCase("ko-KR").includes(search);
  });
  const settingsPath = (slug: string) => `/games/${gameSlug}/clan/${clanId}/` + (clanProductKind(slug) === "banner" ? "manage?tab=appearance" : clanProductKind(slug) === "emojis" ? "manage?tab=appearance#clan-emojis" : "board/memories");

  function buy() {
    if (!selected || pending) return;
    start(async () => {
      try {
        const result = await purchaseStoreItemAction(gameSlug, clanId, selected.slug);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("구매했습니다. 클랜에서 함께 사용해 보세요.");
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
        <div className={clanStyles.filterTabs}><RubberSegment label="클랜 꾸미기 분류" labelPosition="hidden" options={[{ id:"banner",label:"배너" }, {id:"emojis",label:"반응"},{id:"photos",label:"사진"},{ id: "owned", label: "보유" }]} value={filter} onChange={setFilter} /><span role="status">{shown.length}개 상품</span></div>
        <div className={cn(styles.tools, clanStyles.tools)}><label className={styles.search}><Search size={16} aria-hidden /><input aria-label="디자인 검색" placeholder="디자인 검색" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      </div>
      <div className={cn(styles.grid, clanStyles.grid)} aria-label="클랜 꾸미기 상품" aria-busy={pending}>
        {shown.map(item => <article key={item.slug} className={cn(styles.product, clanStyles.product)} data-previewed={preview?.slug === item.slug || undefined} aria-label={item.name_ko}>
          <div className={styles.productHeading}><h3>{item.name_ko}</h3>{item.rarity && <span className={clanStyles.rarity}>{BANNER_RARITIES[item.rarity].label}</span>}{item.is_premium_only && <span className={styles.premium}><Crown size={12} aria-hidden />Premium</span>}{sameClanBannerPattern(item.asset_url, bannerUrl) && <span className={styles.applied}><Check size={12} aria-hidden />적용 중</span>}</div>
          <button type="button" className={cn(styles.preview, clanProductKind(item.slug)==="banner"?clanStyles.preview:clanStyles.packPreview)} aria-label={`${item.name_ko} 미리보기`} aria-pressed={preview?.slug === item.slug} onClick={() => {setPreview(item);setBannerView("applied");}}>
            {clanProductKind(item.slug)==="banner" ? <>{item.asset_url && <ClanBannerImage url={previewUrlFor(item) ?? item.asset_url} alt={`${item.name_ko} 배너 미리보기`} sizes="(max-width: 640px) 100vw, 600px" />}<span className={clanStyles.identity}><span className={clanStyles.icon}>{iconUrl ? <Image src={iconUrl} alt="" fill sizes="36px" unoptimized className="object-cover" /> : <Shield size={20} aria-hidden />}</span><span>{clanName}</span></span></> : <ClanProductPreview slug={item.slug}/>}
          </button>
          {readClanBannerUrl(item.asset_url) && <CosmeticColorPicker compact label={`${item.name_ko} 색상`} value={paletteFor(item)} onChange={paletteId => setPalette(item, paletteId)} />}
          <div className={styles.productFooter}>
            <strong>{item.purchased ? "보유 중" : <><Coins size={14} aria-hidden />{item.price_coins.toLocaleString("ko-KR")}<small>코인</small></>}</strong>
            {item.purchased ? canManageClanPool || ["frames","stickers"].includes(clanProductKind(item.slug)) ? <Link href={settingsPath(item.slug)} className={buttonVariants({ size: "sm", variant: "secondary" })} aria-label={clanProductKind(item.slug)==="banner"?"구매 완료 · 설정하기":item.name_ko+" 사용하기"}>{clanProductKind(item.slug)==="banner"?"설정하기":clanProductKind(item.slug)==="emojis"?"등록하기":"사용하기"}</Link> : <Button size="sm" variant="secondary" disabled>구매 완료</Button>
              : item.is_premium_only && !planIsPremium ? <Button size="sm" variant="outline" onClick={() => setPremiumOpen(true)}>플랜 비교 보기</Button>
              : <Button size="sm" title={item.disabledReason ?? undefined} disabled={pending || !item.canAttemptPurchase} onClick={() => setSelected(item)}>{item.canAttemptPurchase ? "구매" : canManageClanPool ? "코인 부족" : "권한 필요"}</Button>}
          </div>
        </article>)}
        {!shown.length && <div className={styles.empty}><Search size={28} aria-hidden /><h3>{query.trim() ? "검색 결과가 없습니다." : filter === "owned" ? "보유한 상품이 없습니다." : "표시할 디자인이 없습니다."}</h3><p>다른 분류나 검색어를 확인해 보세요.</p>{query.trim() && <Button variant="outline" onClick={() => setQuery("")}>검색 지우기</Button>}</div>}
      </div>
    </section>
    <StorePremiumPlanDialog open={premiumOpen} onOpenChange={setPremiumOpen} actorRole={actorRole} gameSlug={gameSlug} clanId={clanId} />
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="w-[calc(100vw-2rem)] min-w-0 overflow-x-hidden sm:max-w-5xl"><DialogHeader className="pr-10"><DialogTitle>{preview?.name_ko} 미리보기</DialogTitle><DialogDescription>{preview&&clanProductKind(preview.slug)==="banner"?"실제 대시보드 표시와 원본 이미지 전체를 비교하세요.":preview&&clanProductKind(preview.slug)==="emojis"?"10슬롯을 열고 클랜 이미지를 직접 업로드합니다. 정적 PNG·WebP·JPG · 256KB · 128×128px.":"클랜에서 구매하면 모든 클랜원이 추억 사진에 사용할 수 있습니다."}</DialogDescription></DialogHeader>
      {preview&&clanProductKind(preview.slug)==="banner"?<><RubberSegment label="배너 미리보기 방식" labelPosition="hidden" options={[{id:"applied",label:"실제 적용"},{id:"original",label:"이미지 전체"}]} value={bannerView} onChange={setBannerView}/><div className={clanStyles.bannerStage}>{bannerView==="applied"?<ClanHero ctx={{...ctx,bannerUrl:previewUrl??null}} basePath={`/games/${gameSlug}/clan/${clanId}`} showLobbyAction={false}/>:<div className={clanStyles.bannerOriginal}>{previewUrl&&<ClanBannerImage url={previewUrl} alt="배너 원본 전체" sizes="1000px"/>}</div>}</div>{previewSelection && <><CosmeticColorPicker value={paletteFor(preview)} onChange={paletteId => setPalette(preview, paletteId)}/><p className="text-xs text-muted-foreground">패턴을 한 번 구매하면 모든 제공 색상을 사용할 수 있습니다.</p></>}</>:preview?<ClanProductPreview slug={preview.slug}/>:null}
      <DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>닫기</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !pending) setSelected(null); }}><DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>꾸미기 구매</DialogTitle><DialogDescription>{selected?.name_ko}를 클랜 코인으로 구매합니다. {readClanBannerUrl(selected?.asset_url) ? "패턴 구매에 모든 제공 색상이 포함되며, 구매 후 설정에서 적용할 수 있습니다." : "구매 후 적용할 수 있습니다."}</DialogDescription></DialogHeader>
      <dl className={styles.checkout}><div><dt>클랜 코인 사용</dt><dd>{selected?.price_coins.toLocaleString("ko-KR")} 코인</dd></div><div><dt>구매 후 잔액</dt><dd>{(clanCoins - (selected?.price_coins ?? 0)).toLocaleString("ko-KR")} 코인</dd></div></dl>
      <p className="text-xs text-muted-foreground">구매 후 일반 환불은 지원되지 않습니다.</p>
      <DialogFooter><Button variant="ghost" disabled={pending} onClick={() => setSelected(null)}>취소</Button><Button disabled={pending} onClick={buy}>{pending ? "구매 중…" : "구매 확정"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
