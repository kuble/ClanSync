"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { loadRoundAuctionCatalogAction } from "@/app/actions/clan-auction-items";
import { Button } from "@/components/ui/button";
import { effectiveAuctionItems, type RoundAuctionCatalog } from "@/lib/balance/auction-items";
import { ClanAuctionItemSettings } from "./clan-auction-item-settings";
import { HelpText } from "./help-text";

type Loaded = Awaited<ReturnType<typeof loadRoundAuctionCatalogAction>>;
export function BalanceAuctionItemSettings({ gameSlug, clanId, roundId, value, onChange, disabled, onPreview }: {
  gameSlug: string;
  clanId: string;
  roundId: string;
  value?: RoundAuctionCatalog;
  onChange: (value: RoundAuctionCatalog) => void;
  disabled: boolean;
  onPreview: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reload, setReload] = useState(0);
  const [managing, setManaging] = useState(false);
  useEffect(() => {
    let current = true;
    loadRoundAuctionCatalogAction(gameSlug, clanId, roundId).then((result) => {
      if (current) setLoaded(result);
    }).catch(() => {
      if (current) setLoaded({ ok: false, error: "아이템 목록을 불러오지 못했습니다." });
    });
    return () => { current = false; };
  }, [gameSlug, clanId, roundId, reload]);
  async function refresh() {
    const result = await loadRoundAuctionCatalogAction(gameSlug, clanId, roundId);
    setLoaded(result);
  }
  const catalog = value ?? { excludedItemIds: [], items: [] };
  const available = loaded?.ok ? effectiveAuctionItems(loaded.items, catalog).length : 0;
  return <section className="rounded-2xl border bg-background shadow-xl" aria-label="전략 아이템 구성" data-testid="round-auction-items">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <h3 className="text-sm font-bold"><HelpText label="전략 아이템 구성" help="선택한 목록에서 경매 시작 시 3개를 뽑습니다. 변경한 구성은 오른쪽 설정 적용을 눌러 저장합니다." /></h3>
      <Button variant="ghost" size="sm" onClick={onPreview}>편성 미리보기</Button>
    </header>
    <div tabIndex={0} className="board-scroll h-[min(32rem,60dvh)] space-y-4 overflow-y-auto overscroll-contain p-5 focus-visible:outline-2 focus-visible:outline-ring" aria-label="전략 아이템 목록" aria-busy={!loaded}>
      {!loaded ? <div role="status" className="space-y-4"><span className="sr-only">아이템을 불러오는 중…</span><h4 className="text-sm font-semibold">클랜 기본 아이템</h4>{[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="h-20 rounded-xl border bg-muted/30 motion-safe:animate-pulse" />)}</div> : !loaded.ok ? <div role="alert" className="space-y-3 text-sm"><p>{loaded.error}</p><Button size="sm" variant="outline" onClick={() => { setLoaded(null); setReload((n) => n + 1); }}>다시 시도</Button></div> : managing && loaded.canEditShared ? <>
        <Button size="sm" variant="ghost" onClick={() => setManaging(false)}><ArrowLeft className="size-4" />아이템 선택으로</Button>
        <ClanAuctionItemSettings gameSlug={gameSlug} clanId={clanId} items={loaded.items} onSaved={refresh} disabled={disabled} />
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs font-medium ${available < 3 ? "text-warning" : "text-primary"}`} role="status">선택한 아이템 {available}개{available < 3 ? " · 3개 이상 선택해 주세요." : " · 경매마다 3개 추첨"}</p>
          {loaded.canEditShared && <Button variant="outline" size="sm" disabled={disabled} onClick={() => setManaging(true)}><Settings2 className="size-3.5" />기본 아이템 관리</Button>}
        </div>
        <section className="space-y-3" aria-label="클랜 기본 아이템 선택">
          <h4 className="flex items-center gap-2 text-sm font-semibold"><HelpText label="클랜 기본 아이템" help="클랜에서 등록한 아이템입니다. 이 내전에서 쓸 항목을 선택하세요. 깜짝 내전에서는 내용과 가격을 수정할 수 없습니다." /><span className="rounded bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">{loaded.flash ? "선택만 가능" : "클랜 공통"}</span></h4>
          {loaded.items.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">등록된 기본 아이템이 없습니다.</p> : <ul className="divide-y rounded-xl border">
            {loaded.items.map((item) => <li key={item.id}><label className={`flex items-center gap-3 p-3 ${!item.enabled ? "opacity-50" : "cursor-pointer hover:bg-muted/40"}`}>
              <input type="checkbox" className="size-4 shrink-0 accent-primary" aria-label={`${item.name} 선택`} checked={item.enabled && !catalog.excludedItemIds.includes(item.id)} disabled={disabled || !item.enabled} onChange={(event) => onChange({ ...catalog, excludedItemIds: event.target.checked ? catalog.excludedItemIds.filter((id) => id !== item.id) : [...catalog.excludedItemIds, item.id] })} />
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{item.name}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.description}</span></span>
              <span className="shrink-0 text-sm font-bold tabular-nums">{item.enabled ? `${item.cost.toLocaleString()}pt` : "사용 중지"}</span>
            </label></li>)}
          </ul>}
        </section>
        {loaded.flash && <ClanAuctionItemSettings gameSlug={gameSlug} clanId={clanId} items={catalog.items} disabled={disabled} onChange={(items) => onChange({ ...catalog, items })} />}
      </>}
    </div>
  </section>;
}
