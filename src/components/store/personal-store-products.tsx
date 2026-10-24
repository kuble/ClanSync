"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Tag } from "lucide-react";
import { toast } from "sonner";
import { purchaseHousingFurnitureAction } from "@/app/actions/profile-housing";
import { purchaseProfileTitleAction } from "@/app/actions/profile-titles";
import type { HousingResult } from "@/lib/housing/types";
import type { NamecardResult } from "@/lib/profile/namecard";
import { FurniturePreview } from "@/components/profile/housing-furniture-preview";
import { Namecard } from "@/components/profile/namecard";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PersonalStoreCategory = "all" | "furniture" | "title" | "frame";
type Product = { id: string; kind: "furniture" | "title"; name: string; description: string; price: number; owned: boolean; visualKey?: string };

export function PersonalStoreProducts({ housing, namecard, category, coins }: {
  housing: HousingResult; namecard: NamecardResult; category: PersonalStoreCategory; coins: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const products: Product[] = [
    ...(housing.ok ? housing.state.catalog.map((item) => ({
      id: item.id, kind: "furniture" as const, name: item.name, description: item.description,
      price: item.price, owned: housing.state.inventory.some((owned) => owned.catalogId === item.id), visualKey: item.visualKey,
    })) : []),
    ...(namecard.ok ? namecard.state.catalog.filter((item) => item.category === "sub" && item.price_coins > 0).map((item) => ({
      id: item.id, kind: "title" as const, name: item.name_ko, description: "모든 게임에서 사용하는 네임카드 칭호입니다.",
      price: item.price_coins, owned: namecard.state.owned.includes(item.id),
    })) : []),
  ];

  function buy() {
    if (!selected || pending) return;
    start(async () => {
      setError("");
      try {
        const result = selected.kind === "furniture"
          ? await purchaseHousingFurnitureAction({ catalogId: selected.id })
          : await purchaseProfileTitleAction(selected.id);
        if (!result.ok) { setError(result.error); return; }
        setSelected(null);
        toast.success(selected.kind === "furniture" ? "가구를 구매했습니다. 미니룸 보관함에서 꺼내보세요." : "칭호를 구매했습니다. 프로필에서 장착해 주세요.");
        router.refresh();
      } catch {
        setError("구매 결과를 확인하지 못했습니다. 다시 시도해도 중복 차감되지 않습니다.");
      }
    });
  }

  return <>
    {!housing.ok && (category === "all" || category === "furniture") && <p role="alert" className="col-span-full rounded-xl border p-5 text-sm text-destructive">{housing.error}<Button variant="ghost" size="sm" onClick={() => router.refresh()}>다시 불러오기</Button></p>}
    {!namecard.ok && (category === "all" || category === "title") && <p role="alert" className="col-span-full rounded-xl border p-5 text-sm text-destructive">{namecard.error}<Button variant="ghost" size="sm" onClick={() => router.refresh()}>다시 불러오기</Button></p>}
    {products.filter((item) => category === "all" || category === item.kind).map((item) => <article key={item.id} aria-label={item.name} className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-36 items-center justify-center overflow-hidden border-b bg-surface p-4">
        {item.kind === "furniture" ? <FurniturePreview code={item.visualKey!} className="[&_svg]:h-full [&_svg]:w-full" /> : <Namecard displayName="Player#1234" title={item.name} compact />}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Tag size={12} aria-hidden />{item.kind === "furniture" ? "3D 미니룸 가구" : "공통 칭호"}</p>
        <div><h3 className="text-base font-bold">{item.name}</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p></div>
        <strong className="mt-auto flex items-center gap-1.5 pt-2 text-lg tabular-nums"><Coins size={16} className="text-pro-gold" aria-hidden />{item.price.toLocaleString("ko-KR")}<span className="text-xs font-normal text-muted-foreground">개인 코인</span></strong>
        {item.owned ? <Link href={item.kind === "furniture" ? "/profile/miniroom" : "/profile"} className={buttonVariants({ variant: "secondary" })}><Check size={14} aria-hidden />보유 중 · 설정하기</Link> : <Button disabled={pending || coins < item.price} aria-label={`${item.name} 구매`} onClick={() => { setError(""); setSelected(item); }}>{coins < item.price ? "코인 부족" : "구매"}</Button>}
      </div>
    </article>)}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !pending) setSelected(null); }}><DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>{selected?.kind === "furniture" ? "가구 구매" : "칭호 구매"}</DialogTitle><DialogDescription>{selected?.name}을 개인 코인으로 구매합니다. 구매한 아이템은 프로필에서 배치하거나 장착할 수 있습니다.</DialogDescription></DialogHeader>
      {selected?.kind === "furniture" && <div className="h-36"><FurniturePreview code={selected.visualKey!} className="[&_svg]:h-full [&_svg]:w-full" /></div>}
      <div className="rounded-xl border bg-surface p-4 text-sm"><p>사용 코인 {selected?.price.toLocaleString("ko-KR")} · 구매 후 잔액 {(coins - (selected?.price ?? 0)).toLocaleString("ko-KR")} 코인</p><p className="mt-3 text-xs text-muted-foreground">구매한 아이템은 영구 보유하며 일반 환불은 지원되지 않습니다.</p></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setSelected(null)}>취소</Button><Button disabled={pending || coins < (selected?.price ?? 0)} onClick={buy}>{pending ? "구매 중…" : "구매 확정"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}
