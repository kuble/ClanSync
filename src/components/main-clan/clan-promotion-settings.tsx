"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Megaphone, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { publishClanPromotionAction, saveClanRecruitmentAction } from "@/app/actions/clan-promotion";
import { RECRUITMENT_TIERS, type ClanRecruitment } from "@/lib/clan/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const panel = "min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5";
const select = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function ClanPromotionSettings({ gameSlug, clanId, initial, posts }: {
  gameSlug: string; clanId: string; initial: ClanRecruitment;
  posts: { id: string; title: string; created_at: string }[];
}) {
  const router = useRouter();
  const draft = useRef<HTMLFormElement>(null);
  const [publishing, publish] = useTransition();
  const [saving, save] = useTransition();
  const [postError, setPostError] = useState("");
  const [conditionsError, setConditionsError] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [birthYearLimit, setBirthYearLimit] = useState(initial.min_birth_year?.toString() ?? "");
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
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">우리 클랜의 분위기와 함께하고 싶은 활동을 소개해 주십시오. 게시한 글은 게임 커뮤니티의 클랜 홍보에 공개됩니다.</p>
        <form ref={draft} onSubmit={publishPost} className="mt-5 space-y-4">
          <fieldset disabled={publishing} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="promotion-title">홍보글 제목</Label><Input id="promotion-title" name="title" required maxLength={200} placeholder="함께할 클랜원을 찾습니다" /></div>
            <div className="space-y-2"><Label htmlFor="promotion-content">홍보글 내용</Label><textarea id="promotion-content" name="content" required maxLength={8000} rows={9} className="min-h-48 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring" placeholder={"어떤 클랜인가요?\n주로 함께하는 시간과 활동을 알려주십시오."} /><p className="text-xs text-muted-foreground">최대 8,000자 · 이메일 등 개인 정보는 포함하지 마십시오.</p></div>
          </fieldset>
          {postError && <p role="alert" className="text-xs text-destructive">{postError}</p>}
          {postId && <p role="status" className="text-xs text-primary">홍보글을 게시했습니다. <Link className="underline underline-offset-4" href={`/games/${gameSlug}/board/${postId}`}>게시한 글 보기</Link></p>}
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={publishing}>{publishing ? "게시 중…" : "홍보글 게시"}</Button></div>
        </form>
      </section>
      <section className={panel} aria-labelledby="recruitment-heading">
        <h4 id="recruitment-heading" className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4 text-primary" aria-hidden />가입 조건</h4>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">출생연도·성별 조건을 충족한 계정만 신청할 수 있습니다. 변경한 조건은 기존 대기 신청의 승인 시에도 적용됩니다.</p>
        <form onSubmit={saveConditions} className="mt-5 space-y-4">
          <fieldset disabled={saving} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="recruitment-year">출생연도 상한 (선택)</Label><Input id="recruitment-year" name="min_birth_year" type="number" min={1950} max={new Date().getFullYear()-10} value={birthYearLimit} onChange={event=>setBirthYearLimit(event.target.value)} placeholder="제한 없음" aria-describedby="recruitment-year-hint" /><p id="recruitment-year-hint" className="text-xs leading-relaxed text-muted-foreground">예: 2006 입력 시 2006년생 및 이전 출생자만 신청할 수 있습니다. 비워 두면 제한하지 않습니다.</p></div>
            <div className="space-y-2"><Label htmlFor="recruitment-gender">성별 조건</Label><select id="recruitment-gender" name="gender_policy" defaultValue={initial.gender_policy} className={select} aria-describedby="recruitment-gender-hint"><option value="all">제한 없음</option><option value="male">남성</option><option value="female">여성</option></select><p id="recruitment-gender-hint" className="text-xs leading-relaxed text-muted-foreground">성별 비공개 계정은 성별 제한이 있는 클랜에 신청할 수 없습니다.</p></div>
            <fieldset className="space-y-2 border-t border-border pt-4"><legend className="text-xs font-medium">모집 티어 (복수 선택)</legend><div className="flex flex-wrap gap-2">{RECRUITMENT_TIERS.map(([value,label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs has-checked:border-primary/40 has-checked:bg-primary/10 has-checked:text-primary"><input type="checkbox" name="tier_range" value={value} defaultChecked={initial.tier_range.includes(value)} className="accent-primary" />{label}</label>)}</div><p className="text-xs leading-relaxed text-muted-foreground">티어는 모집 정보로만 표시하며 가입을 제한하지 않습니다. 선택하지 않으면 티어 무관으로 표시됩니다.</p></fieldset>
          </fieldset>
          {conditionsError && <p role="alert" className="text-xs text-destructive">{conditionsError}</p>}
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={saving}>{saving ? "저장 중…" : "가입 조건 저장"}</Button></div>
        </form>
      </section>
    </div>
    <section className={panel} aria-labelledby="recent-promotions-heading"><h4 id="recent-promotions-heading" className="text-sm font-semibold">최근 홍보글</h4>{posts.length ? <ul className="mt-3 divide-y divide-border">{posts.map(post => <li key={post.id}><Link href={`/games/${gameSlug}/board/${post.id}`} className="flex min-w-0 items-center justify-between gap-3 py-3 text-sm hover:text-primary"><span className="min-w-0 truncate">{post.title}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /></Link></li>)}</ul> : <p className="mt-3 text-xs text-muted-foreground">아직 게시한 홍보글이 없습니다.</p>}</section>
  </div>;
}
