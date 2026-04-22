"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createClanAndLeadAction } from "@/app/actions/game-clan-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIERS = [
  { v: "bronze", l: "브론즈" },
  { v: "silver", l: "실버" },
  { v: "gold", l: "골드" },
  { v: "plat", l: "플래티넘" },
  { v: "diamond", l: "다이아" },
  { v: "master", l: "마스터" },
  { v: "gm", l: "GM" },
  { v: "challenger", l: "챌린저" },
] as const;

const STYLES = [
  { v: "social", l: "친목" },
  { v: "casual", l: "즐겜" },
  { v: "tryhard", l: "빡겜" },
  { v: "pro", l: "프로" },
] as const;

export function ClanCreateForm({ gameSlug }: { gameSlug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const y = new Date().getFullYear();
  const yearOpts: number[] = [];
  for (let i = y - 10; i >= 1970; i--) yearOpts.push(i);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await createClanAndLeadAction(gameSlug, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("클랜을 만들었습니다.");
      router.refresh();
      router.push(`/games/${gameSlug}/clan/${r.clanId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">클랜명 *</Label>
        <Input id="name" name="name" required maxLength={24} placeholder="1~24자" />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">지향 (선택)</span>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <label key={s.v} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="style" value={s.v} className="accent-primary" />
              {s.l}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">모집 티어 (복수 선택)</span>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <label key={t.v} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="tier_range"
                value={t.v}
                className="accent-primary"
              />
              {t.l}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">태그 (쉼표로 구분, 최대 5개)</Label>
        <Input
          id="tags"
          name="tags"
          placeholder="예: 저녁, 랭크, 음성"
        />
        <p className="text-muted-foreground text-xs">
          한글·영문·숫자·공백만, 태그당 1~12자
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="min_birth_year">가입 최소 출생연도 (선택)</Label>
        <select
          id="min_birth_year"
          name="min_birth_year"
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          defaultValue=""
        >
          <option value="">무관</option>
          {yearOpts.map((yr) => (
            <option key={yr} value={yr}>
              {yr}년생 이전
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">성별 정책</span>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="gender_policy" value="all" defaultChecked className="accent-primary" />
            무관
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="gender_policy" value="male" className="accent-primary" />
            남성
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="gender_policy" value="female" className="accent-primary" />
            여성
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_members">최대 인원 (2~200)</Label>
        <Input
          id="max_members"
          name="max_members"
          type="number"
          min={2}
          max={200}
          defaultValue={30}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">소개</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rules">규칙</Label>
        <textarea
          id="rules"
          name="rules"
          rows={3}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="discord_url">디스코드 URL</Label>
          <Input id="discord_url" name="discord_url" type="url" placeholder="https://" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kakao_url">카카오 URL</Label>
          <Input id="kakao_url" name="kakao_url" type="url" placeholder="https://" />
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "처리 중…" : "클랜 만들기"}
      </Button>
    </form>
  );
}
