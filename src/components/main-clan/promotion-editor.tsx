"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROMOTION_IMAGE_COUNT, PROMOTION_IMAGE_LIMIT, promotionImageUrl, type PromotionBlock } from "@/lib/clan/promotion";
import styles from "./promotion-editor.module.css";

export type PromotionDraftBlock = { key: string; type: "text"; text: string } | { key: string; type: "image"; path: string; alt: string; file?: File; preview?: string };
export function draftPromotionBlocks(blocks: PromotionBlock[]): PromotionDraftBlock[] {
  return blocks.map((block, index) => ({ ...block, key: `saved-${index}` }));
}

export function PromotionEditor({ gameSlug, clanId, blocks, onChange, disabled }: {
  gameSlug: string; clanId: string; blocks: PromotionDraftBlock[]; onChange: (value: PromotionDraftBlock[]) => void; disabled: boolean;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const cursor = useRef<{ key: string; position: number } | null>(null);
  const previews = useRef(new Set<string>());
  useEffect(() => { const urls = previews.current; return () => urls.forEach(url => URL.revokeObjectURL(url)); }, []);
  const photos = blocks.filter(block => block.type === "image").length;
  const firstText = blocks.findIndex(block => block.type === "text");
  const length = blocks.flatMap(block => block.type === "text" ? [block.text] : []).join("\n\n").trim().length;
  function insertPhotos(files: File[]) {
    if (!files.length) return;
    if (photos + files.length > PROMOTION_IMAGE_COUNT || blocks.length + files.length * 2 > 25) { toast.error("사진은 6장까지 넣을 수 있습니다."); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > PROMOTION_IMAGE_LIMIT)) { toast.error("JPEG·PNG·WebP 사진을 한 장당 5MB 이내로 선택해 주십시오."); return; }
    const images: PromotionDraftBlock[] = files.flatMap(file => {
      const preview = URL.createObjectURL(file); previews.current.add(preview);
      return [{ key: crypto.randomUUID(), type: "image" as const, path: "", alt: "", file, preview }, { key: crypto.randomUUID(), type: "text" as const, text: "" }];
    });
    const index = blocks.findIndex(block => block.key === cursor.current?.key && block.type === "text");
    const target = blocks[index];
    if (target?.type === "text") {
      const position = Math.min(cursor.current?.position ?? target.text.length, target.text.length);
      const last = images[images.length - 1];
      if (last.type === "text") last.text = target.text.slice(position);
      onChange([...blocks.slice(0, index), { ...target, text: target.text.slice(0, position) }, ...images, ...blocks.slice(index + 1)]);
    } else onChange([...blocks, ...images]);
  }
  function move(index: number, delta: number) {
    const next = [...blocks]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next);
  }
  return <div className={styles.editor}>
    <div className={styles.toolbar}><Button type="button" variant="ghost" size="sm" disabled={disabled || photos >= 6} onClick={() => picker.current?.click()}><ImagePlus size={16} aria-hidden />사진 넣기</Button><span>{photos} / 6장</span></div>
    <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="홍보 사진 선택" disabled={disabled} onChange={event => { insertPhotos(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <div className={styles.blocks}>{blocks.map((block, index) => block.type === "text" ? <textarea key={block.key} id={index === firstText ? "promotion-content" : undefined} aria-label={index === firstText ? "내용" : `내용 ${index + 1}`} value={block.text} rows={blocks.length === 1 ? 8 : 3} disabled={disabled} placeholder={index === firstText ? "클랜 소개와 함께하고 싶은 활동을 적어보세요." : "사진 아래에 이야기를 이어보세요."} onSelect={event => { cursor.current = { key: block.key, position: event.currentTarget.selectionStart }; }} onChange={event => onChange(blocks.map(item => item.key === block.key ? { ...block, text: event.target.value } : item))} /> : <figure key={block.key} className={styles.photo}>
      <div className={styles.image}><Image src={block.preview ?? promotionImageUrl(gameSlug, clanId, block.path)} alt={block.alt || "클랜 홍보 사진"} width={1200} height={700} loading="eager" unoptimized /></div>
      <figcaption><input aria-label={`사진 설명 ${index + 1}`} maxLength={160} value={block.alt} disabled={disabled} placeholder="사진 설명 (선택)" onChange={event => onChange(blocks.map(item => item.key === block.key ? { ...block, alt: event.target.value } : item))} /><div><Button type="button" size="icon" variant="ghost" aria-label="사진 위로 이동" disabled={disabled || index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></Button><Button type="button" size="icon" variant="ghost" aria-label="사진 아래로 이동" disabled={disabled || index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></Button><Button type="button" size="icon" variant="ghost" aria-label="사진 삭제" disabled={disabled} onClick={() => onChange(blocks.filter(item => item.key !== block.key))}><Trash2 size={15} /></Button></div></figcaption>
    </figure>)}</div>
    <p className={styles.hint} aria-live="polite"><span className={length > 8000 ? "text-destructive" : ""}>{length.toLocaleString()} / 8,000자</span><span>글을 누른 위치에 사진이 들어갑니다.</span></p>
  </div>;
}
