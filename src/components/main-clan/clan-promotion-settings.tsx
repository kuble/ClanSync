"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, SlidersHorizontal, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@base-ui/react/slider";
import { saveClanPromotionAction } from "@/app/actions/clan-promotion";
import { createClient } from "@/lib/supabase/client";
import { PROMOTION_IMAGE_BUCKET, promotionBlocks, parsePromotionBlocks, type PromotionPost } from "@/lib/clan/promotion";
import { PromotionEditor, draftPromotionBlocks, type PromotionDraftBlock } from "./promotion-editor";
import { recruitmentTiers, normalizeRecruitmentTier, type ClanRecruitment } from "@/lib/clan/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClanRecruitmentFields } from "@/components/onboarding/clan-recruitment-fields";
import { PromotionAudienceFields } from "./promotion-audience-fields";
import styles from "./clan-promotion-settings.module.css";

export function ClanPromotionSettings({ gameSlug, clanId, initial, post }: {
  gameSlug: string; clanId: string; initial: ClanRecruitment & { style: string | null; recruitment_positions: string[] };
  post: PromotionPost | null;
}) {
  const RECRUITMENT_TIERS = recruitmentTiers(gameSlug);
  const router = useRouter();
  const [saving, save] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [postId] = useState(() => post?.id ?? crypto.randomUUID());
  const [version, setVersion] = useState(post?.updated_at ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [blocks, setBlocks] = useState(() => draftPromotionBlocks(promotionBlocks(post)));
  const [tierRange, setTierRange] = useState<number[]>(() => {
    const initialTiers = initial.tier_range.map(tier => normalizeRecruitmentTier(gameSlug,tier));
    const indices = RECRUITMENT_TIERS.flatMap(([tier], index) => initialTiers.includes(tier) ? [index] : []);
    return indices.length ? [Math.min(...indices), Math.max(...indices)] : [0, RECRUITMENT_TIERS.length - 1];
  });
  const allTiers = tierRange[0] === 0 && tierRange[1] === RECRUITMENT_TIERS.length - 1;
  const selectedTiers = allTiers ? [] : RECRUITMENT_TIERS.slice(tierRange[0], tierRange[1] + 1);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setError(""); setSaved(false);
    save(async () => {
      const uploaded: string[] = [];
      const uploadedByKey = new Map<string,string>();
      try {
        const prepared: PromotionDraftBlock[] = [];
        for (const block of blocks) {
          if (block.type !== "image" || !block.file) { prepared.push(block); continue; }
          const existing = uploadedByKey.get(block.key);
          if (existing) { prepared.push({key:block.key,type:"image",path:existing,alt:block.alt}); continue; }
          const response = await fetch(`/api/games/${gameSlug}/clans/${clanId}/promotion-images`, { method: "POST", headers: { "Content-Type": block.file.type, "X-Promotion-Id": postId }, body: block.file });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.error ?? "사진을 올리지 못했습니다.");
          uploaded.push(result.path);
          uploadedByKey.set(block.key,result.path);
          prepared.push({ key: block.key, type: "image", path: result.path, alt: block.alt });
        }
        const body = prepared.map(block => block.type === "text" ? { type: "text", text: block.text } : { type: "image", path: block.path, alt: block.alt });
        if (!parsePromotionBlocks(body)) throw new Error("내용은 8,000자, 사진은 6장까지 저장할 수 있습니다.");
        form.set("post_id", postId); form.set("updated_at", version); form.set("blocks", JSON.stringify(body));
        const result = await saveClanPromotionAction(gameSlug, clanId, form);
        if (!result.ok) throw new Error(result.error);
        setVersion(result.updatedAt); setBlocks(prepared); setSaved(true);
        uploaded.length = 0;
        toast.success("홍보글과 가입 조건을 저장했습니다."); router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "저장하지 못했습니다. 다시 시도해 주십시오.");
        if (uploaded.length) await createClient().storage.from(PROMOTION_IMAGE_BUCKET).remove(uploaded);
      }
    });
  }
  return <form onSubmit={submit} className={styles.form}>
    <div className={styles.layout}>
      <section className={`${styles.panel} ${styles.editorPanel}`} aria-labelledby="promotion-heading">
        <header className={styles.panelHeader}><span className={styles.sectionIcon}><Megaphone size={20} aria-hidden /></span><h4 id="promotion-heading">홍보글 작성</h4><span className={styles.tag}>클랜 찾기에 공개</span></header>
          <fieldset disabled={saving} className={styles.editorFields}>
            <div className="space-y-2"><Label htmlFor="promotion-title">제목</Label><Input id="promotion-title" name="title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} placeholder="함께할 클랜원을 찾습니다" /></div>
            <div className="space-y-2"><Label htmlFor="promotion-content">내용</Label><PromotionEditor gameSlug={gameSlug} clanId={clanId} blocks={blocks} onChange={setBlocks} disabled={saving} /></div>
          </fieldset>
      </section>
      <section className={`${styles.panel} ${styles.recruitmentPanel}`} aria-labelledby="recruitment-heading">
        <header className={styles.panelHeader}>
          <span className={styles.sectionIcon}><SlidersHorizontal size={20} aria-hidden /></span>
          <h4 id="recruitment-heading">모집 설정</h4>
        </header>
        <div className={styles.settingsBody}>
          <section aria-labelledby="eligibility-heading">
            <h5 id="eligibility-heading" className={styles.groupTitle}>가입 조건</h5>
            <ClanRecruitmentFields prefix="recruitment" initial={initial} disabled={saving} layout="grouped" />
          </section>
          <section className={styles.audienceSection} aria-labelledby="audience-heading">
            <div className={styles.audienceHeading}>
              <h5 id="audience-heading" className={styles.groupTitle}>모집 대상</h5>
              <span>홍보글에 표시</span>
            </div>
            <PromotionAudienceFields gameSlug={gameSlug} initialStyle={initial.style} initialPositions={initial.recruitment_positions} disabled={saving} />
            {RECRUITMENT_TIERS.length > 1 && <Slider.Root value={tierRange} onValueChange={setTierRange} min={0} max={RECRUITMENT_TIERS.length-1} step={1} largeStep={1} thumbCollisionBehavior="none" disabled={saving} className={styles.tierSection} aria-describedby="recruitment-tier-hint">
              <div className={styles.tierHeading}>
                <Slider.Label className={styles.audienceLabel}>모집 티어</Slider.Label>
                <output className={styles.tierValue}>{allTiers ? "티어 무관" : tierRange[0] === tierRange[1] ? RECRUITMENT_TIERS[tierRange[0]][1] : `${RECRUITMENT_TIERS[tierRange[0]][1]} ~ ${RECRUITMENT_TIERS[tierRange[1]][1]}`}</output>
              </div>
              <p id="recruitment-tier-hint" className="sr-only">이 범위 밖의 티어도 가입을 신청할 수 있습니다.</p>
              <div className="mx-2.5"><Slider.Control className="relative flex min-h-11 w-full touch-none items-center"><Slider.Track data-tier-track className="relative h-1.5 w-full rounded-full bg-muted"><Slider.Indicator className="absolute h-full rounded-full bg-primary" />{RECRUITMENT_TIERS.map(([tier],index)=><span key={tier} aria-hidden className="pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/30" style={{left:`${index/(RECRUITMENT_TIERS.length-1)*100}%`}} />)}{[0,1].map(index=><Slider.Thumb key={index} index={index} aria-label={index===0 ? "최소 모집 티어" : "최대 모집 티어"} getAriaValueText={(_,value)=>RECRUITMENT_TIERS[value][1]} className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none focus-within:ring-4 focus-within:ring-ring/30" />)}</Slider.Track></Slider.Control></div>
              <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden><span>{RECRUITMENT_TIERS[0][1]}</span><span>{RECRUITMENT_TIERS[RECRUITMENT_TIERS.length-1][1]}</span></div>
              {selectedTiers.map(([tier])=><input key={tier} type="hidden" name="tier_range" value={tier} />)}
            </Slider.Root>}
          </section>
        </div>
      </section>
    </div>
    <div className={styles.saveBar}>
      <div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}{saved && <p role="status" className="text-xs text-primary">홍보글과 가입 조건을 저장했습니다.</p>}</div>
      <Button type="submit" disabled={saving}>{saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />}{saving ? "저장 중…" : "변경사항 저장"}</Button>
    </div>
  </form>;
}
