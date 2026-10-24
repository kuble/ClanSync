"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimShowcaseProductAction } from "@/app/actions/profile-showcase";
import { Button } from "@/components/ui/button";
import { ShowcaseArt } from "@/components/profile/showcase-art";
import type { ShowcaseResult } from "@/lib/showcase/domain";
import styles from "@/components/profile/showcase.module.css";

export function ShowcaseProducts({ initial, userId }: { initial: ShowcaseResult; userId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  function claim(catalogId: string, name: string) {
    start(async () => {
      setMessage("");
      try {
        const result = await claimShowcaseProductAction(catalogId, userId);
        setMessage(result.ok ? `${name} 1개를 보관함에 추가했습니다.` : result.error ?? "다시 시도해 주세요.");
        if (result.ok) router.refresh();
      } catch { setMessage("연결이 끊겼습니다. 새로고침으로 보유 수량을 확인해 주세요."); }
    });
  }
  return <section id="showcase" className="mb-10" aria-label="취향 진열장 굿즈">
    <h2 className="text-xl font-semibold">취향 진열장</h2>
    <p className="my-3 text-sm text-muted-foreground">QA 체험 상품입니다. 코인 차감 없이 한 개씩 받아 꾸며보세요. 보유한 수량만큼 전시할 수 있습니다.</p>
    {!initial.ok ? <p role="alert">{initial.error}<Button variant="ghost" onClick={()=>router.refresh()}>다시 불러오기</Button></p> : <div className={styles.storeGrid}>
      {initial.state.catalog.filter(p=>p.available).map(product=><article className={styles.storeItem} key={product.id} aria-label={product.name}>
        <ShowcaseArt sprite={product.sprite} imagePath={product.image_path} className={styles.storeArt}/><h3>{product.name}</h3><p>{product.kind==="goods"?"굿즈":product.kind==="light"?"배치 조명":"선반 장식"} · 보유 {initial.state.owned[product.id]??0}개</p>
        {product.kind === "light" && <p>상단 프레임이나 선반 아래에 달아 원하는 곳을 비춰요. 보관하면 빛도 꺼집니다.</p>}
        <Button variant="outline" disabled={pending || (initial.state.owned[product.id]??0)>=60} onClick={()=>claim(product.id,product.name)} aria-label={`${product.name} 1개 받기`}>{pending?"처리 중…":"무료 체험 · 1개 받기"}</Button>
      </article>)}
    </div>}
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
    <Link href="/profile" className="mt-4 inline-block text-sm underline">내 진열장 꾸미기</Link>
  </section>;
}
