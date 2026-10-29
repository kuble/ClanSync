"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROFILE_PHOTO_LIMIT } from "@/lib/profile/photo";
import { PlayerAvatar } from "./player-avatar";
import { ProfilePhotoCropDialog } from "./profile-photo-crop-dialog";
import type { SquareCrop } from "@/lib/images/square-crop";

export function ProfilePhotoSettings({ initialUrl, emblem }: { initialUrl: string | null; emblem?: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl), [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function clear() { setFile(null); setPreview(null); if (input.current) input.current.value = ""; }
  function save(crop?: SquareCrop, remove = false) {
    if (pending || (!remove && !file)) return;
    const data = new FormData();
    if (file) data.set("image", file);
    if (crop) data.set("crop", JSON.stringify(crop));
    start(async () => {
      try {
        const response = await fetch("/api/profile-photo", { method: remove ? "DELETE" : "POST", body: remove ? undefined : data });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "사진을 저장하지 못했습니다.");
        setUrl(result.url); clear(); router.refresh();
        toast.success(remove ? "프로필 사진을 제거했습니다." : "프로필 사진을 저장했습니다.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "사진을 저장하지 못했습니다."); }
    });
  }
  return <section aria-label="공통 프로필 사진" className="mb-5 flex items-center gap-4 border-b pb-5">
    <PlayerAvatar photoUrl={url} emblem={emblem} label="내" size={64}/>
    <div className="min-w-0 flex-1 space-y-2">
      <h2 className="text-sm font-semibold">프로필 사진</h2>
      <p className="text-xs text-muted-foreground">게시판·통계 댓글에 함께 표시됩니다.</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="프로필 사진 파일" className="hidden" disabled={pending} onChange={event => {
        const next = event.target.files?.[0];
        if (!next) return;
        if (!next.size || next.size > PROFILE_PHOTO_LIMIT || !["image/jpeg", "image/png", "image/webp"].includes(next.type)) { toast.error("JPG·PNG·WebP 사진을 2MB 이내로 선택해 주십시오."); event.target.value = ""; return; }
        setFile(next); setPreview(URL.createObjectURL(next));
      }}/>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => input.current?.click()}><Camera className="size-3.5" aria-hidden/>사진 선택</Button>
        {url && <Button type="button" size="icon-xs" variant="ghost" aria-label="프로필 사진 제거" title="사진 제거" disabled={pending} onClick={() => save(undefined, true)}><Trash2 className="size-3.5 text-muted-foreground" aria-hidden/></Button>}
      </div>
    </div>
    {preview && <ProfilePhotoCropDialog src={preview} pending={pending} onClose={clear} onSave={crop => save(crop)}/>}
  </section>;
}
