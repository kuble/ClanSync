"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Megaphone, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@base-ui/react/slider";
import { publishClanPromotionAction, saveClanRecruitmentAction } from "@/app/actions/clan-promotion";
import { recruitmentTiers, normalizeRecruitmentTier, type ClanRecruitment } from "@/lib/clan/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const panel = "min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5";
const select = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function ClanPromotionSettings({ gameSlug, clanId, initial, posts }: {
  gameSlug: string; clanId: string; initial: ClanRecruitment;
  posts: { id: string; title: string; created_at: string }[];
}) {
  const RECRUITMENT_TIERS = recruitmentTiers(gameSlug);
  const router = useRouter();
  const draft = useRef<HTMLFormElement>(null);
  const [publishing, publish] = useTransition();
  const [saving, save] = useTransition();
  const [postError, setPostError] = useState("");
  const [conditionsError, setConditionsError] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [birthYearLimit, setBirthYearLimit] = useState(initial.min_birth_year?.toString() ?? "");
  const [tierRange, setTierRange] = useState<number[]>(() => {
    const initialTiers = initial.tier_range.map(tier => normalizeRecruitmentTier(gameSlug,tier));
    const indices = RECRUITMENT_TIERS.flatMap(([tier], index) => initialTiers.includes(tier) ? [index] : []);
    return indices.length ? [Math.min(...indices), Math.max(...indices)] : [0, RECRUITMENT_TIERS.length - 1];
  });
  const allTiers = tierRange[0] === 0 && tierRange[1] === RECRUITMENT_TIERS.length - 1;
  const selectedTiers = allTiers ? [] : RECRUITMENT_TIERS.slice(tierRange[0], tierRange[1] + 1);
  const maxYear = new Date().getFullYear() - 10;
  function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishing) return;
    const form = new FormData(event.currentTarget);
    setPostError(""); setPostId(null);
    publish(async () => {
      try {
        const result = await publishClanPromotionAction(gameSlug, clanId, form);
        if (!result.ok) { setPostError(result.error); return; }
        setPostId(result.postId); draft.current?.reset();
        toast.success("홍보글을 게시했습니다."); router.refresh();
      } catch { setPostError("홍보글을 게시하지 못했습니다. 다시 시도해 주십시오."); }
    });
  }
  function saveConditions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setConditionsError("");
    save(async () => {
      try {
        const result = await saveClanRecruitmentAction(gameSlug, clanId, form);
        if (!result.ok) { setConditionsError(result.error); return; }
        toast.success("가입 조건을 저장했습니다."); router.refresh();
      } catch { setConditionsError("가입 조건을 저장하지 못했습니다. 다시 시도해 주십시오."); }
    });
  }
  return <div className="space-y-5">
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className={panel} aria-labelledby="promotion-heading">
        <h4 id="promotion-heading" className="flex items-center gap-2 text-sm font-semibold"><Megaphone className="size-4 text-primary" aria-hidden />홍보글 작성</h4>
        <form ref={draft} onSubmit={publishPost} className="mt-5 space-y-4">
          <fieldset disabled={publishing} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="promotion-title">제목</Label><Input id="promotion-title" name="title" required maxLength={200} placeholder="함께할 클랜원을 찾습니다" /></div>
            <div className="space-y-2"><Label htmlFor="promotion-content">내용</Label><textarea id="promotion-content" name="content" required maxLength={8000} rows={9} className="min-h-48 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring" placeholder="클랜 소개와 주요 활동" aria-describedby="promotion-content-limit" /><p id="promotion-content-limit" className="text-xs text-muted-foreground">최대 8,000자</p></div>
          </fieldset>
          {postError && <p role="alert" className="text-xs text-destructive">{postError}</p>}
          {postId && <p role="status" className="text-xs text-primary">홍보글을 게시했습니다. <Link className="underline underline-offset-4" href={`/games/${gameSlug}/board/${postId}`}>게시한 글 보기</Link></p>}
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={publishing}>{publishing ? "게시 중…" : "홍보글 게시"}</Button></div>
        </form>
      </section>
      <section className={panel} aria-labelledby="recruitment-heading">
        <h4 id="recruitment-heading" className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4 text-primary" aria-hidden />가입 조건</h4>
        <form onSubmit={saveConditions} className="mt-5 space-y-4">
          <fieldset disabled={saving} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="recruitment-year">출생연도 상한</Label><select id="recruitment-year" name="min_birth_year" value={birthYearLimit} onChange={event=>setBirthYearLimit(event.target.value)} className={select}><option value="">제한 없음</option>{Array.from({length:maxYear-1949},(_,index)=>maxYear-index).map(year=><option key={year} value={year}>{year}년생까지</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="recruitment-gender">성별 조건</Label><select id="recruitment-gender" name="gender_policy" defaultValue={initial.gender_policy} className={select} aria-describedby="recruitment-gender-hint"><option value="all">제한 없음</option><option value="male">남성</option><option value="female">여성</option></select><p id="recruitment-gender-hint" className="text-xs leading-relaxed text-muted-foreground">비공개 계정은 성별 제한 클랜에 신청할 수 없습니다.</p></div>
            {RECRUITMENT_TIERS.length > 1 && <Slider.Root value={tierRange} onValueChange={setTierRange} min={0} max={RECRUITMENT_TIERS.length-1} step={1} largeStep={1} thumbCollisionBehavior="none" disabled={saving} className="border-t border-border pt-4" aria-describedby="recruitment-tier-hint">
              <div className="flex items-center justify-between gap-2"><Slider.Label className="text-xs font-medium">모집 티어</Slider.Label><Button type="button" variant="ghost" size="sm" className={`h-7 px-2 text-xs ${allTiers ? "text-primary" : "text-muted-foreground"}`} disabled={saving} aria-label="모집 티어 무관으로 설정" aria-pressed={allTiers} onClick={()=>setTierRange([0,RECRUITMENT_TIERS.length-1])}>무관</Button></div>
              <p className="mt-2 text-sm font-medium text-primary" aria-live="polite">{allTiers ? "티어 무관" : tierRange[0] === tierRange[1] ? RECRUITMENT_TIERS[tierRange[0]][1] : `${RECRUITMENT_TIERS[tierRange[0]][1]} ~ ${RECRUITMENT_TIERS[tierRange[1]][1]}`}</p>
              <div className="mx-2.5"><Slider.Control className="relative flex min-h-11 w-full touch-none items-center"><Slider.Track data-tier-track className="relative h-1.5 w-full rounded-full bg-muted"><Slider.Indicator className="absolute h-full rounded-full bg-primary" />{RECRUITMENT_TIERS.map(([tier],index)=><span key={tier} aria-hidden className="pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/30" style={{left:`${index/(RECRUITMENT_TIERS.length-1)*100}%`}} />)}{[0,1].map(index=><Slider.Thumb key={index} index={index} aria-label={index===0 ? "최소 모집 티어" : "최대 모집 티어"} getAriaValueText={(_,value)=>RECRUITMENT_TIERS[value][1]} className="block size-5 rounded-full border-2 border-primary bg-background shadow-sm outline-none focus-within:ring-4 focus-within:ring-ring/30" />)}</Slider.Track></Slider.Control></div>
              <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden><span>{RECRUITMENT_TIERS[0][1]}</span><span>{RECRUITMENT_TIERS[RECRUITMENT_TIERS.length-1][1]}</span></div>
              {selectedTiers.map(([tier])=><input key={tier} type="hidden" name="tier_range" value={tier} />)}
              <p id="recruitment-tier-hint" className="mt-3 text-xs text-muted-foreground">모집 정보로만 표시됩니다.</p>
            </Slider.Root>}
          </fieldset>
          {conditionsError && <p role="alert" className="text-xs text-destructive">{conditionsError}</p>}
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={saving}>{saving ? "저장 중…" : "가입 조건 저장"}</Button></div>
        </form>
      </section>
    </div>
    <section className={panel} aria-labelledby="recent-promotions-heading"><h4 id="recent-promotions-heading" className="text-sm font-semibold">최근 홍보글</h4>{posts.length ? <ul className="mt-3 divide-y divide-border">{posts.map(post => <li key={post.id}><Link href={`/games/${gameSlug}/board/${post.id}`} className="flex min-w-0 items-center justify-between gap-3 py-3 text-sm hover:text-primary"><span className="min-w-0 truncate">{post.title}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /></Link></li>)}</ul> : <p className="mt-3 text-xs text-muted-foreground">아직 게시한 홍보글이 없습니다.</p>}</section>
  </div>;
}
