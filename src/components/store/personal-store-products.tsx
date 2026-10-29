"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Coins, Crown, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { purchaseProfileTitleAction } from "@/app/actions/profile-titles";
import { purchaseStoreItemAction } from "@/app/actions/clan-store-purchase";
import { saveNamecardThemeAction, saveNameplateSelectionAction } from "@/app/actions/profile-decorations";
import { namecardAppearance, type NamecardState } from "@/lib/profile/namecard";
import { namecardProducts, STORE_CATEGORIES, withProduct, type NamecardProduct, type PremiumFrameOffer, type StoreCategory } from "@/lib/store/namecard-products";
import { CLANSYNC_NAMEPLATE_CHANGED } from "@/lib/profile-decoration-sync";
import { Namecard } from "@/components/profile/namecard";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./personal-store.module.css";
import clanStyles from "./clan-store.module.css";
import { cn } from "@/lib/utils";

export function PersonalStoreProducts({ state, displayName, offer }: {
  state: NamecardState; displayName: string; offer: PremiumFrameOffer | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const [category, setCategory] = useState<StoreCategory>(() => namecardProducts(state, offer)[0]?.category ?? "theme");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selected, setSelected] = useState<NamecardProduct | null>(null);
  const [error, setError] = useState("");
  const [purchased, setPurchased] = useState<string[]>([]);
  const [coinOverride, setCoinOverride] = useState<number | null>(null);
  const [selectionOverride, setSelectionOverride] = useState<NamecardState["selections"] | null>(null);
  const selections = selectionOverride ?? state.selections;
  const coins = coinOverride ?? state.coinBalance;
  const products = namecardProducts({ ...state, selections }, offer).map(p => ({ ...p, available: p.available || purchased.includes(p.id) }));
  const candidate = products.find(product => product.id === previewId) ?? null;
  const layout = category === "emblem" || category === "portrait" ? "compact" : category === "sub" ? "label" : "wide";
  const pageSize = layout === "wide" ? 6 : 12;
  const filtered = products.filter(p => p.category === category
    && `${p.name} ${p.description}`.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR")));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const preview = (product: NamecardProduct, complete = false) => {
    const wholeCard = complete || product.category === "theme";
    const appearance = namecardAppearance(state.catalog, wholeCard ? withProduct(selections, product) : product.selections);
    return <Namecard displayName={displayName} {...appearance} previewPart={complete || product.category === "theme" ? undefined : product.category} fill />;
  };
  const applied = (p: NamecardProduct) => p.selections.every(next => selections.some(s => s.category === next.category && s.option_id === next.option_id));
  const reason = (p: NamecardProduct) => p.available ? null : p.premium && !offer?.eligible ? "Premium 클랜 가입 시 구매 가능" : coins < p.price ? "코인 부족" : null;

  function apply(product: NamecardProduct) {
    if (busy.current || !product.available) return;
    busy.current = true;
    start(async () => {
      try {
        const first = product.selections[0];
        const result = product.category === "theme" ? await saveNamecardThemeAction(product.id)
          : await saveNameplateSelectionAction({ category: first.category, optionId: first.option_id });
        if (!result.ok) { toast.error(result.error); return; }
        setSelectionOverride(withProduct(selections, product));
        window.dispatchEvent(new CustomEvent(CLANSYNC_NAMEPLATE_CHANGED));
        toast.success("모든 게임의 네임카드에 적용했습니다.");
        router.refresh();
      } catch { toast.error("적용하지 못했습니다. 다시 시도해 주십시오."); }
      finally { busy.current = false; }
    });
  }
  function buy() {
    if (!selected || busy.current || reason(selected)) return;
    const product = selected;
    busy.current = true;
    start(async () => {
      setError("");
      try {
        if (product.legacy) {
          if (!offer?.gameSlug || !offer.clanId) { setError("Premium 클랜 가입 정보를 확인해 주십시오."); return; }
          const result = await purchaseStoreItemAction(offer.gameSlug, offer.clanId, "profile_entrance_fx");
          if (!result.ok) { setError(result.error); return; }
          setCoinOverride(coins - product.price);
        } else {
          const result = await purchaseProfileTitleAction(product.id);
          if (!result.ok) { setError(result.error); return; }
          setCoinOverride(result.coinBalance);
        }
        setPurchased(ids => [...ids, product.id]);
        setSelected(null);
        toast.success("구매했습니다. 적용 버튼으로 네임카드에 장착해 보십시오.");
        router.refresh();
      } catch { setError("구매 결과를 확인하지 못했습니다. 새로고침 후 보유 여부를 확인해 주십시오."); }
      finally { busy.current = false; }
    });
  }

  return <div className={cn(styles.shop,clanStyles.shop)}>
    <header className={clanStyles.header}>
      <h1><Store className="size-5 text-primary" aria-hidden />개인 상점</h1>
      <div className={clanStyles.balance} aria-label="보유 코인"><Coins size={16} aria-hidden /><span>내 코인</span><strong>{coins.toLocaleString("ko-KR")}</strong></div>
    </header>
    <section className={styles.catalog} aria-label="네임카드 디자인">
      <div className={cn(styles.filters,clanStyles.filters)}>
        <div className={clanStyles.filterTabs}><RubberSegment label="개인 꾸미기 분류" labelPosition="hidden" options={STORE_CATEGORIES} value={category} onChange={value => { setCategory(value); setPage(1); }} /><span role="status">{filtered.length}개 디자인 · {currentPage} / {totalPages} 페이지</span></div>
        <div className={cn(styles.tools,clanStyles.tools)}>
          <label className={styles.search}><Search size={16} aria-hidden /><input aria-label="디자인 검색" placeholder="디자인 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label>
        </div>
      </div>
      <div className={cn(styles.grid,clanStyles.grid)} aria-label="개인 꾸미기 상품" aria-busy={pending}>
        {shown.map(product => <article key={product.id} className={cn(styles.product,clanStyles.product)} data-kind={product.category} data-previewed={candidate?.id === product.id || undefined} aria-label={product.name}>
          <div className={styles.productHeading}><h3>{product.name}</h3>{product.rarity === "normal" && <span className={clanStyles.rarity}>노말</span>}{product.premium && <span className={styles.premium}><Crown size={12} aria-hidden />Premium</span>}{applied(product) && <span className={styles.applied}><Check size={12} aria-hidden />적용 중</span>}</div>
          <button type="button" className={styles.preview} aria-label={product.name + " 미리보기"} aria-pressed={candidate?.id === product.id} onClick={() => setPreviewId(product.id)}>{preview(product)}</button>
            <div className={styles.productFooter}><strong>{product.available ? product.price === 0 ? "기본 제공" : "보유 중" : <><Coins size={14} aria-hidden />{product.price.toLocaleString("ko-KR")}<small>코인</small></>}</strong>
              {product.available ? <Button size="sm" variant={applied(product) ? "secondary" : "default"} disabled={pending || applied(product)} onClick={() => apply(product)} aria-label={`${product.name} 적용`}>{applied(product) ? "적용 중" : product.category === "theme" ? "세트 적용" : "적용"}</Button>
                : <Button size="sm" disabled={pending || !!reason(product)} onClick={() => { setSelected(product); setError(""); }} aria-label={`${product.name} 구매`}>{reason(product) ? product.premium && !offer?.eligible ? "Premium 필요" : "코인 부족" : "구매"}</Button>}
            </div>
            {reason(product) && <p className={styles.reason}>{reason(product)}</p>}
        </article>)}
        {!shown.length && <div className={styles.empty}><Search size={28} aria-hidden /><h3>{query.trim() ? "검색 결과가 없습니다." : "표시할 디자인이 없습니다."}</h3><p>다른 분류나 검색어를 확인해 보십시오.</p>{query.trim() && <Button variant="outline" onClick={() => { setQuery(""); setPage(1); }}>검색 지우기</Button>}</div>}
      </div>
      <nav aria-label="상품 페이지" className={styles.pagination}>
        <Button variant="outline" size="icon" aria-label="이전 페이지" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i).map(number => <Button key={number} size="icon" variant={currentPage === number ? "default" : "ghost"} aria-label={`${number} 페이지`} aria-current={currentPage === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</Button>)}
        <Button variant="outline" size="icon" aria-label="다음 페이지" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></Button>
      </nav>
    </section>
    <Dialog open={!!candidate} onOpenChange={open=>{if(!open&&!busy.current)setPreviewId(null);}}><DialogContent showCloseButton={!pending} className="sm:max-w-3xl">
      <DialogHeader><DialogTitle>{candidate?.name} 미리보기</DialogTitle><DialogDescription>{candidate?.description}</DialogDescription></DialogHeader>
      {candidate&&<section aria-label="적용 미리보기" className={styles.modalPreview}>{preview(candidate,true)}</section>}
      <DialogFooter><Button variant="outline" aria-label="미리보기 닫기" disabled={pending} onClick={()=>setPreviewId(null)}>닫기</Button>{candidate&&(candidate.available?<Button disabled={pending||applied(candidate)} onClick={()=>apply(candidate)} aria-label={candidate.name+" 적용"}>{applied(candidate)?"적용 중":"적용"}</Button>:<Button disabled={pending||!!reason(candidate)} onClick={()=>{setPreviewId(null);setSelected(candidate);setError("");}} aria-label={candidate.name+" 구매"}>{reason(candidate)?candidate.premium&&!offer?.eligible?"Premium 필요":"코인 부족":"구매"}</Button>)}</DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy.current) setSelected(null); }}><DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>네임카드 디자인 구매</DialogTitle><DialogDescription>{selected?.name}을 개인 코인으로 구매합니다. 구매 후 적용할 수 있습니다.</DialogDescription></DialogHeader>
      {selected && <div className={styles.modalPreview}>{preview(selected, true)}</div>}
      <dl className={styles.checkout}><div><dt>사용 코인</dt><dd>{selected?.price.toLocaleString("ko-KR")}</dd></div><div><dt>구매 후 잔액</dt><dd>{(coins - (selected?.price ?? 0)).toLocaleString("ko-KR")}</dd></div></dl>
      <p className="text-xs text-muted-foreground">구매한 디자인은 영구 보유하며 일반 환불은 지원되지 않습니다.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setSelected(null)}>취소</Button><Button disabled={pending || !selected || !!reason(selected)} onClick={buy}>{pending ? "구매 중…" : "구매 확정"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
