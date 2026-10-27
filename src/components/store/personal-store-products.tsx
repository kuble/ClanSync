"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Coins, Crown, Search, SlidersHorizontal } from "lucide-react";
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

const PAGE_SIZE = 6;
export function PersonalStoreProducts({ state, displayName, offer }: {
  state: NamecardState; displayName: string; offer: PremiumFrameOffer | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const busy = useRef(false);
  const [category, setCategory] = useState<StoreCategory>("all");
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NamecardProduct | null>(null);
  const [error, setError] = useState("");
  const [purchased, setPurchased] = useState<string[]>([]);
  const [coinOverride, setCoinOverride] = useState<number | null>(null);
  const [selectionOverride, setSelectionOverride] = useState<NamecardState["selections"] | null>(null);
  const selections = selectionOverride ?? state.selections;
  const coins = coinOverride ?? state.coinBalance;
  const current = namecardAppearance(state.catalog, selections);
  const products = namecardProducts({ ...state, selections }, offer).map(p => ({ ...p, available: p.available || purchased.includes(p.id) }));
  const filtered = products.filter(p => (category === "all" || p.category === category)
    && (ownership === "all" || (ownership === "available" ? p.available : !p.available))
    && `${p.name} ${p.description}`.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR")));
  if (sort !== "recommended") filtered.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "price-asc" ? a.price - b.price : b.price - a.price);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const preview = (product: NamecardProduct) => <Namecard displayName={displayName} {...namecardAppearance(state.catalog, withProduct(selections, product))} fill />;
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
      } catch { toast.error("적용하지 못했습니다. 다시 시도해 주세요."); }
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
          if (!offer?.gameSlug || !offer.clanId) { setError("Premium 클랜 가입 정보를 확인해 주세요."); return; }
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
        toast.success("구매했습니다. 적용 버튼으로 네임카드에 장착해 보세요.");
        router.refresh();
      } catch { setError("구매 결과를 확인하지 못했습니다. 새로고침 후 보유 여부를 확인해 주세요."); }
      finally { busy.current = false; }
    });
  }

  return <div className={styles.shop}>
    <header className={styles.header}>
      <div><Link href="/profile" className={styles.back}><ArrowLeft size={14} aria-hidden />내 프로필</Link><h1>네임카드 상점</h1><p>디자인을 비교하고, 나만의 조합을 완성하세요.</p></div>
      <div className={styles.wallet} aria-label="보유 코인"><Coins size={22} aria-hidden /><div><span>내 코인</span><strong>{coins.toLocaleString("ko-KR")}</strong></div></div>
    </header>
    <section className={styles.current} aria-label="현재 네임카드"><div><h2>현재 적용 모습</h2><p>게임마다 같은 디자인으로 표시됩니다.</p></div><Namecard displayName={displayName} {...current} fill /></section>
    <section className={styles.catalog} aria-label="네임카드 디자인">
      <div className={styles.filters}>
        <RubberSegment label="개인 꾸미기 분류" labelPosition="hidden" options={STORE_CATEGORIES} value={category} onChange={value => { setCategory(value); setPage(1); }} />
        <div className={styles.tools}>
          <label className={styles.search}><Search size={16} aria-hidden /><input aria-label="디자인 검색" placeholder="디자인 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label>
          <label className={styles.select}><SlidersHorizontal size={14} aria-hidden /><select aria-label="보유 상태" value={ownership} onChange={e => { setOwnership(e.target.value); setPage(1); }}><option value="all">보유 전체</option><option value="available">사용 가능</option><option value="unowned">미보유</option></select></label>
          <select className={styles.sort} aria-label="디자인 정렬" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="recommended">추천순</option><option value="price-asc">가격 낮은순</option><option value="price-desc">가격 높은순</option><option value="name">이름순</option></select>
        </div>
      </div>
      <div className={styles.results}><p role="status">{filtered.length}개 디자인 <span>· {currentPage} / {totalPages} 페이지</span></p><span>구매·적용은 모든 게임에 공통</span></div>
      <div className={styles.grid} aria-label="개인 꾸미기 상품" aria-busy={pending}>
        {shown.map(product => <article key={product.id} className={styles.product} aria-label={product.name}>
          <div className={styles.productHeading}><h3>{product.name}</h3>{product.premium && <span className={styles.premium}><Crown size={12} aria-hidden />Premium</span>}{applied(product) && <span className={styles.applied}><Check size={12} aria-hidden />적용 중</span>}</div>
          <div className={styles.preview}>{preview(product)}</div>
            <div className={styles.productFooter}><strong>{product.available ? product.price === 0 ? "기본 제공" : "보유 중" : <><Coins size={14} aria-hidden />{product.price.toLocaleString("ko-KR")}<small>코인</small></>}</strong>
              {product.available ? <Button size="sm" variant={applied(product) ? "secondary" : "default"} disabled={pending || applied(product)} onClick={() => apply(product)} aria-label={`${product.name} 적용`}>{applied(product) ? "적용 중" : product.category === "theme" ? "세트 적용" : "적용"}</Button>
                : <Button size="sm" disabled={pending || !!reason(product)} onClick={() => { setSelected(product); setError(""); }} aria-label={`${product.name} 구매`}>{reason(product) ? product.premium && !offer?.eligible ? "Premium 필요" : "코인 부족" : "구매"}</Button>}
            </div>
            {reason(product) && <p className={styles.reason}>{reason(product)}</p>}
        </article>)}
        {!shown.length && <div className={styles.empty}><Search size={28} aria-hidden /><h3>조건에 맞는 디자인이 없습니다.</h3><p>다른 검색어나 분류를 선택해 보세요.</p><Button variant="outline" onClick={() => { setCategory("all"); setQuery(""); setOwnership("all"); setPage(1); }}>필터 초기화</Button></div>}
      </div>
      <nav aria-label="상품 페이지" className={styles.pagination}>
        <Button variant="outline" size="icon" aria-label="이전 페이지" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i).map(number => <Button key={number} size="icon" variant={currentPage === number ? "default" : "ghost"} aria-label={`${number} 페이지`} aria-current={currentPage === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</Button>)}
        <Button variant="outline" size="icon" aria-label="다음 페이지" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></Button>
      </nav>
    </section>
    <p className={styles.notice}>구매한 디자인은 계정에 영구 보관됩니다. 개인 코인만 사용하며, 구매 후 일반 환불은 지원되지 않습니다.</p>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy.current) setSelected(null); }}><DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>네임카드 디자인 구매</DialogTitle><DialogDescription>{selected?.name}을 개인 코인으로 구매합니다. 구매 후 적용할 수 있습니다.</DialogDescription></DialogHeader>
      {selected && <div className={styles.modalPreview}>{preview(selected)}</div>}
      <dl className={styles.checkout}><div><dt>사용 코인</dt><dd>{selected?.price.toLocaleString("ko-KR")}</dd></div><div><dt>구매 후 잔액</dt><dd>{(coins - (selected?.price ?? 0)).toLocaleString("ko-KR")}</dd></div></dl>
      <p className="text-xs text-muted-foreground">구매한 디자인은 영구 보유하며 일반 환불은 지원되지 않습니다.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setSelected(null)}>취소</Button><Button disabled={pending || !selected || !!reason(selected)} onClick={buy}>{pending ? "구매 중…" : "구매 확정"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
