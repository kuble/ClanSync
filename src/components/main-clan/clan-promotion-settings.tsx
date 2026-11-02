"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, Megaphone, Eye, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@base-ui/react/slider";
import { createClanAndLeadAction } from "@/app/actions/game-clan-onboarding";
import { saveClanPromotionAction } from "@/app/actions/clan-promotion";
import { createClient } from "@/lib/supabase/client";
import { PROMOTION_IMAGE_BUCKET, promotionBlocks, promotionImageUrl, parsePromotionBlocks, type PromotionPost } from "@/lib/clan/promotion";
import { PromotionEditor, draftPromotionBlocks, type PromotionDraftBlock } from "./promotion-editor";
import { readRecruitmentYears, recruitmentTiers, normalizeRecruitmentTier, type ClanRecruitment } from "@/lib/clan/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClanRecruitmentFields } from "@/components/onboarding/clan-recruitment-fields";
import { PromotionAudienceFields } from "./promotion-audience-fields";
import { ClanInviteShare } from "./clan-invite-share";
import { StatHelp, StatTooltip } from "./stat-help";
import { Dialog } from "@/components/ui/dialog";
import { ClanPromotionDialogContent, type PromotionDisplayBlock } from "@/components/onboarding/clan-promotion-dialog-content";
import type { ClanListRow } from "@/components/onboarding/clan-join-list";
import styles from "./clan-promotion-settings.module.css";

export function ClanPromotionSettings({ gameSlug, clanId, initial, post }: {
  gameSlug: string; clanId: string | null; initial: ClanRecruitment & ClanListRow & { promotion_public: boolean; style: string | null; recruitment_positions: string[] };
  post: PromotionPost | null;
}) {
  const RECRUITMENT_TIERS = recruitmentTiers(gameSlug);
  const creating = clanId === null;
  const [createdId, setCreatedId] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  const [preview, setPreview] = useState<{ clan: ClanListRow; title: string; blocks: PromotionDisplayBlock[] } | null>(null);
  const [saving, save] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [postId] = useState(() => post?.id ?? crypto.randomUUID());
  const [version, setVersion] = useState(post?.updated_at ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [contactUrl, setContactUrl] = useState(initial.interview_url ?? "");
  const [blocks, setBlocks] = useState(() => draftPromotionBlocks(promotionBlocks(post)));
  const [tierRange, setTierRange] = useState<number[]>(() => {
    const initialTiers = initial.tier_range.map(tier => normalizeRecruitmentTier(gameSlug,tier));
    const indices = RECRUITMENT_TIERS.flatMap(([tier], index) => initialTiers.includes(tier) ? [index] : []);
    return indices.length ? [Math.min(...indices), Math.max(...indices)] : [0, RECRUITMENT_TIERS.length - 1];
  });
  const allTiers = tierRange[0] === 0 && tierRange[1] === RECRUITMENT_TIERS.length - 1;
  const selectedTiers = allTiers ? [] : RECRUITMENT_TIERS.slice(tierRange[0], tierRange[1] + 1);
  function showPreview() {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const years = readRecruitmentYears(form);
    if (!years.ok) { setError(years.error); return; }
    const positions = form.getAll("recruitment_positions").map(String);
    setPreview({
      clan: { ...initial, ...(creating ? { name: String(form.get("name") || "클랜명") } : {}), birth_year_from: years.birth_year_from, min_birth_year: years.min_birth_year, style: String(form.get("style") ?? "") || null,
        gender_policy: String(form.get("gender_policy") ?? "all") as ClanRecruitment["gender_policy"],
        tier_range: selectedTiers.map(([tier]) => tier), recruitment_positions: positions.includes("all") ? [] : positions },
      title: title.trim() || String(form.get("name") || "홍보글 미리보기"),
      blocks: blocks.map(block => block.type === "text" ? { type: "text", text: block.text }
        : { type: "image", src: previewImageSource(block), alt: block.alt }),
    });
  }
  function previewImageSource(image: Extract<PromotionDraftBlock, { type: "image" }>) {
    if (!image.file) return promotionImageUrl(gameSlug, clanId ?? createdId ?? "", image.path);
    const url = URL.createObjectURL(image.file);
    previewUrls.current.add(url);
    return url;
  }
  function closePreview() {
    setPreview(null);
    previewUrls.current.forEach(url => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setError(""); setSaved(false);
    save(async () => {
      let targetId = clanId ?? createdId;
      const uploaded: string[] = [];
      const uploadedByKey = new Map<string,string>();
      try {
        if (creating) {
          form.set("title", title.trim() || String(form.get("name") ?? "").trim());
          if (!targetId) {
            form.set("description", blocks.flatMap(block => block.type === "text" ? [block.text] : []).join("\n\n").trim());
            const hasContent = blocks.some(block => block.type === "image" || block.text.trim());
            if (hasContent) form.set("create_private", "1");
            const created = await createClanAndLeadAction(gameSlug, form);
            if (!created.ok) throw new Error(created.error);
            targetId = created.clanId;
            setCreatedId(targetId);
            if (!hasContent) {
              toast.success("클랜을 만들었습니다.");
              window.location.assign(`/games/${gameSlug}/clan/${targetId}/welcome`);
              return;
            }
          }
        }
        if (!targetId) throw new Error("클랜을 확인해 주세요.");
        const prepared: PromotionDraftBlock[] = [];
        for (const block of blocks) {
          if (block.type !== "image" || !block.file) { prepared.push(block); continue; }
          const existing = uploadedByKey.get(block.key);
          if (existing) { prepared.push({key:block.key,type:"image",path:existing,alt:block.alt}); continue; }
          const response = await fetch(`/api/games/${gameSlug}/clans/${targetId}/promotion-images`, { method: "POST", headers: { "Content-Type": block.file.type, "X-Promotion-Id": postId }, body: block.file });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.error ?? "사진을 올리지 못했습니다.");
          uploaded.push(result.path);
          uploadedByKey.set(block.key,result.path);
          prepared.push({ key: block.key, type: "image", path: result.path, alt: block.alt });
        }
        const body = prepared.map(block => block.type === "text" ? { type: "text", text: block.text } : { type: "image", path: block.path, alt: block.alt });
        if (!parsePromotionBlocks(body)) throw new Error("내용은 8,000자, 사진은 6장까지 저장할 수 있습니다.");
        form.set("post_id", postId); form.set("updated_at", version); form.set("blocks", JSON.stringify(body));
        const result = creating
          ? await fetch(`/api/games/${gameSlug}/clans/${targetId}/promotion`, { method: "POST", body: form }).then(response => response.json())
          : await saveClanPromotionAction(gameSlug, targetId, form);
        if (!result.ok) throw new Error(result.error);
        setVersion(result.updatedAt); setBlocks(prepared); setSaved(true);
        uploaded.length = 0;
        if (creating) {
          toast.success("클랜을 만들었습니다.");
          window.location.assign(`/games/${gameSlug}/clan/${targetId}/welcome`);
        } else {
          toast.success("홍보글과 가입 조건을 저장했습니다."); router.refresh();
        }
      } catch (cause) {
        const reason = cause instanceof Error ? cause.message : "다시 시도해 주세요.";
        setError(creating && targetId ? `클랜이 생성되었습니다. 홍보글 저장을 다시 시도해 주세요. ${reason}` : reason);
        if (uploaded.length) await createClient().storage.from(PROMOTION_IMAGE_BUCKET).remove(uploaded);
      }
    });
  }
  return <><form ref={formRef} onSubmit={submit} className={styles.form}>
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby="promotion-heading">
        <header className={styles.panelHeader}>
          <span className={styles.sectionIcon}><Megaphone size={20} aria-hidden /></span>
          <h4 id="promotion-heading">{creating ? "클랜 만들기" : "홍보글 작성"}</h4>
          <div className={styles.publishControl}>
            <StatHelp title="홍보글 게시">켜고 저장하면 클랜 찾기에 공개됩니다. 끄고 저장하면 목록에서 숨겨지고 기존 홍보글 링크도 열리지 않습니다.</StatHelp>
            <label className={styles.visibility}>
              <input type="checkbox" role="switch" aria-label="홍보글 게시" name="promotion_public" defaultChecked={initial.promotion_public} disabled={saving} />
              <span aria-hidden="true" />
            </label>
          </div>
        </header>
          <fieldset disabled={saving} className={styles.editorFields}>
            {creating && <div className="space-y-2"><Label htmlFor="name">클랜명 *</Label><Input id="name" name="name" maxLength={24} required readOnly={!!createdId} placeholder="클랜 이름을 입력해 주세요" /></div>}
            <div className={`space-y-2 ${styles.titleField}`}><Label htmlFor="promotion-title">제목</Label><Input id="promotion-title" name="title" value={title} onChange={event => setTitle(event.target.value)} required={!creating} maxLength={200} placeholder="함께할 클랜원을 찾습니다" /></div>
            <div className={styles.settingsBody}>
              <section aria-label="가입 조건">
                <ClanRecruitmentFields prefix="recruitment" initial={initial} disabled={saving} layout="grouped" />
              </section>
              <section className={styles.audienceSection} aria-label="모집 대상">
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
            <div className="space-y-2"><Label htmlFor="promotion-content">내용</Label><PromotionEditor gameSlug={gameSlug} clanId={clanId ?? createdId ?? ""} blocks={blocks} onChange={setBlocks} disabled={saving} /></div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="interview-url">클랜 연락 링크 (선택)</Label>
                <StatTooltip label="클랜 연락 링크 도움말" description="가입 신청 창에서 ‘클랜에 문의하기’를 누르면 이 주소가 새 탭에서 열립니다." className="inline-flex items-center justify-center size-5 text-muted-foreground">
                  <CircleHelp size={14} aria-hidden />
                </StatTooltip>
              </div>
              <Input id="interview-url" name="interview_url" type="url" maxLength={1000} value={contactUrl} onChange={event => setContactUrl(event.target.value)} placeholder="https://…" />
            </div>
            <div className={styles.previewActions}>
              <div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}{saved && <p role="status" className="text-xs text-primary">홍보글과 가입 조건을 저장했습니다.</p>}</div>
              <Button type="button" variant="outline" disabled={saving} onClick={showPreview}><Eye size={15} aria-hidden />미리보기</Button>
              <Button type="submit" disabled={saving}>{saved ? <Check size={15} aria-hidden /> : <Save size={15} aria-hidden />}{saving ? "저장 중…" : creating && !createdId ? "클랜 만들기" : "변경사항 저장"}</Button>
            </div>
          </fieldset>
      </section>
      {clanId && <ClanInviteShare gameSlug={gameSlug} clanId={clanId} />}
    </div>
  </form>
    <Dialog open={preview !== null} onOpenChange={open => { if (!open) closePreview(); }}>
      {preview && <ClanPromotionDialogContent gameSlug={gameSlug} clan={preview.clan} title={preview.title} blocks={preview.blocks} onClose={closePreview} />}
    </Dialog>
  </>;
}
