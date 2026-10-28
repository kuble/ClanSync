"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImageIcon, Shield, Store, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateClanBannerAction } from "@/app/actions/clan-banner-settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ClanBannerOption = { slug: string; name: string; url: string; owned: boolean };

export function ClanAppearanceSettings({ gameSlug, clanId, clanName, initialIconUrl, initialBannerUrl, banners, canManage }: {
  gameSlug: string; clanId: string; clanName: string; initialIconUrl: string | null; initialBannerUrl: string | null; banners: ClanBannerOption[]; canManage: boolean;
}) {
  const router = useRouter();
  const [pendingImage, startImage] = useTransition();
  const [pendingBanner, startBanner] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState(initialIconUrl);
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [selected, setSelected] = useState<string | null | undefined>(() => initialBannerUrl ? banners.find(b => b.url === initialBannerUrl)?.slug : null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const owned = banners.filter(b => b.owned);
  const nextBannerUrl = selected === undefined ? bannerUrl : selected === null ? null : banners.find(b => b.slug === selected)?.url;
  const base = `/games/${gameSlug}/clan/${clanId}`;

  function saveImage(remove = false) {
    if (!canManage || pendingImage || (!remove && !file)) return;
    const data = new FormData();
    if (file) data.set("image", file);
    startImage(async () => {
      try {
        const response = await fetch(`/api/games/${gameSlug}/clans/${clanId}/profile-image`, { method: remove ? "DELETE" : "POST", body: remove ? undefined : data });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "이미지 저장에 실패했습니다.");
        setIconUrl(result.url ?? null);
        setFile(null); setPreview(null);
        if (input.current) input.current.value = "";
        toast.success(remove ? "기본 프로필 이미지로 변경했습니다." : "프로필 이미지를 변경했습니다.");
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."); }
    });
  }

  return <div className="space-y-5">
    <section aria-labelledby="clan-profile-image-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h3 id="clan-profile-image-heading" className="flex items-center gap-2 text-sm font-semibold"><Shield className="size-4 text-primary" aria-hidden />클랜 프로필 이미지</h3>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-primary/10 text-primary">
          {preview || iconUrl ? <Image src={preview || iconUrl!} alt="클랜 프로필 미리보기" fill sizes="96px" unoptimized className="object-cover" /> : <Shield className="size-10" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs text-muted-foreground">JPG·PNG·WebP · 최대 2MB · 중앙을 기준으로 정사각형 적용</p>
          <input ref={input} id="clan-profile-upload" aria-label="클랜 프로필 이미지 파일" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={!canManage || pendingImage} onChange={event => {
            const next = event.target.files?.[0];
            if (!next) return;
            if (!next.size || next.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(next.type)) { toast.error("JPG·PNG·WebP 이미지를 2MB 이내로 선택해 주세요."); event.target.value = ""; return; }
            setFile(next); setPreview(URL.createObjectURL(next));
          }} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={!canManage || pendingImage} onClick={() => input.current?.click()}><ImageIcon aria-hidden />이미지 선택</Button>
            <Button type="button" size="sm" disabled={!canManage || !file || pendingImage} onClick={() => saveImage()}><Upload aria-hidden />{pendingImage ? "저장 중…" : "이미지 저장"}</Button>
            {iconUrl && <Button type="button" size="sm" variant="ghost" disabled={!canManage || pendingImage} onClick={() => saveImage(true)}>기본 이미지로</Button>}
          </div>
          {file && <p className="break-all text-xs text-muted-foreground">{file.name}</p>}
          {!canManage && <p className="text-xs text-muted-foreground">클랜 꾸미기 관리 권한이 필요합니다.</p>}
        </div>
      </div>
    </section>
    <section aria-labelledby="clan-banner-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="clan-banner-heading" className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="size-4 text-primary" aria-hidden />클랜 배너</h3>
        <Link href={base + "/store"} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"><Store className="size-3.5" aria-hidden />클랜 상점</Link>
      </div>
      <div aria-label="클랜 배너 미리보기" className="relative mt-4 flex min-h-36 items-end gap-3 overflow-hidden rounded-xl border border-border bg-muted p-4 sm:min-h-44">
        {nextBannerUrl && <Image src={nextBannerUrl} alt="선택한 클랜 배너" fill sizes="(max-width: 768px) 100vw, 900px" unoptimized className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
        <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary text-primary-foreground">{preview || iconUrl ? <Image src={preview || iconUrl!} alt="" fill sizes="48px" unoptimized className="object-cover" /> : <Shield className="size-6" aria-hidden />}</span>
        <span className="relative text-sm font-semibold text-white">{clanName}</span>
      </div>
      <div role="group" aria-label="보유 배너 선택" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ slug: null, name: "기본 배너", url: null }, ...owned].map(banner => <button key={banner.slug ?? "default"} type="button" disabled={!canManage || pendingBanner} aria-pressed={selected === banner.slug} onClick={() => setSelected(banner.slug)} className={cn("min-w-0 overflow-hidden rounded-lg border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60", selected === banner.slug ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
          <span className="relative block aspect-[4/1] bg-muted">{banner.url && <Image src={banner.url} alt="" fill sizes="250px" className="object-cover" />}</span>
          <span className="flex min-h-10 items-center justify-between gap-1 px-3 py-2 text-xs"><span>{banner.name}</span>{selected === banner.slug && <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}</span>
        </button>)}
      </div>
      {!owned.length && <p className="mt-3 text-xs text-muted-foreground">클랜 상점에서 구매한 배너를 여기에 표시합니다.</p>}
      {selected === undefined && <p className="mt-3 text-xs text-muted-foreground">기존 배너를 사용 중입니다. 보유 배너를 선택하면 변경할 수 있습니다.</p>}
      <div className="mt-4 flex justify-end"><Button size="sm" disabled={!canManage || pendingBanner || selected === undefined || nextBannerUrl === bannerUrl} onClick={() => startBanner(async () => {
        try {
          const result = await updateClanBannerAction(gameSlug, clanId, selected ?? null);
          if (!result.ok) { toast.error(result.error); return; }
          setBannerUrl(nextBannerUrl ?? null); toast.success("클랜 배너를 변경했습니다."); router.refresh();
        } catch { toast.error("배너 저장에 실패했습니다. 다시 시도해 주세요."); }
      })}>{pendingBanner ? "적용 중…" : "배너 적용"}</Button></div>
    </section>
  </div>;
}
