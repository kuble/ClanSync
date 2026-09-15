"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClanAndLeadAction } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";
import styles from "./onboarding.module.css";

const TIERS = [["bronze", "브론즈"], ["silver", "실버"], ["gold", "골드"], ["plat", "플래티넘"], ["diamond", "다이아몬드"], ["master", "마스터"], ["gm", "그랜드마스터"], ["challenger", "챌린저"]] as const;
const STYLES = [["social", "친목"], ["casual", "즐겜"], ["tryhard", "빡겜"], ["pro", "프로"]] as const;

export function ClanCreateForm({ gameSlug }: { gameSlug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const maxYear = new Date().getFullYear() - 10;
  const years = Array.from({ length: maxYear - 1969 }, (_, index) => maxYear - index);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    start(async () => {
      try {
        const result = await createClanAndLeadAction(gameSlug, formData);
        if (!result.ok) { setError(result.error); return; }
        toast.success("클랜을 만들었습니다.");
        router.refresh();
        router.push(`/games/${gameSlug}/clan/${result.clanId}`);
      } catch { setError("클랜을 만들지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    });
  }
  return <form onSubmit={onSubmit} className={styles.createForm}>
    <header className={styles.createIntro}><h2>우리만의 클랜 만들기</h2><p>클랜을 소개하고 함께할 멤버의 조건을 정해 주세요. 생성하면 클랜장이 됩니다.</p></header>
    {error ? <p className={`${styles.error} mb-5`} role="alert">{error}</p> : null}
    <fieldset className={styles.formSection} disabled={pending}><legend>기본 정보</legend>
      <div className={styles.field}><label htmlFor="name">클랜명 *</label><input id="name" name="name" required maxLength={24} placeholder="클랜 이름을 입력하세요 (1~24자)" /></div>
      <div className={styles.field}><label htmlFor="description">클랜 소개</label><textarea id="description" name="description" rows={3} placeholder="어떤 클랜인지, 주로 언제 함께 플레이하는지 소개해 주세요." /></div>
      <div className={styles.field}><label htmlFor="rules">클랜 규칙</label><textarea id="rules" name="rules" rows={3} placeholder="클랜원들이 함께 지킬 약속을 적어 주세요." /></div>
    </fieldset>
    <fieldset className={styles.formSection} disabled={pending}><legend>모집 조건</legend>
      <fieldset className={styles.choiceGroup}><legend>지향 (선택)</legend><div className={styles.chips}>{STYLES.map(([value, label]) => <label key={value}><input type="radio" name="style" value={value} />{label}</label>)}</div></fieldset>
      <fieldset className={styles.choiceGroup}><legend>모집 티어 (복수 선택)</legend><div className={styles.chips}>{TIERS.map(([value, label]) => <label key={value}><input type="checkbox" name="tier_range" value={value} />{label}</label>)}</div></fieldset>
      <div className={styles.field}><label htmlFor="tags">태그</label><input id="tags" name="tags" placeholder="예: 저녁, 랭크, 음성" /><p>쉼표로 구분해 최대 5개. 태그마다 한글·영문·숫자·공백 1~12자를 입력할 수 있습니다.</p></div>
      <div className={styles.fieldGrid}>
        <div className={styles.field}><label htmlFor="min_birth_year">가입 최소 출생연도 (선택)</label><select id="min_birth_year" name="min_birth_year" defaultValue=""><option value="">무관</option>{years.map((year) => <option key={year} value={year}>{year}년생 이전</option>)}</select></div>
        <div className={styles.field}><label htmlFor="max_members">최대 인원 (2~200)</label><input id="max_members" name="max_members" type="number" min={2} max={200} defaultValue={30} required /></div>
      </div>
      <fieldset className={styles.choiceGroup}><legend>성별 정책</legend><div className={styles.chips}>{[["all", "무관"], ["male", "남성"], ["female", "여성"]].map(([value, label]) => <label key={value}><input type="radio" name="gender_policy" value={value} defaultChecked={value === "all"} />{label}</label>)}</div></fieldset>
    </fieldset>
    <fieldset className={styles.formSection} disabled={pending}><legend>외부 링크 (선택)</legend><div className={styles.fieldGrid}>
      <div className={styles.field}><label htmlFor="discord_url">디스코드 URL</label><input id="discord_url" name="discord_url" type="url" placeholder="https://" /></div>
      <div className={styles.field}><label htmlFor="kakao_url">카카오 URL</label><input id="kakao_url" name="kakao_url" type="url" placeholder="https://" /></div>
    </div></fieldset>
    <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "처리 중…" : "클랜 만들기"}</Button>
  </form>;
}
