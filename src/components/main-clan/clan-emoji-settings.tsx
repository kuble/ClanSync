"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMOJI_LIMIT, clanEmojiUrl, emojiNamePattern, type ClanEmoji } from "@/lib/clan/cosmetics";
export function ClanEmojiSettings({ gameSlug, clanId, emojis, slots, canEdit }: { gameSlug: string; clanId: string; emojis: ClanEmoji[]; slots: number; canEdit: boolean }) {
  const router = useRouter(), input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(""); const [pending, start] = useTransition();
  const endpoint = `/api/games/${gameSlug}/clans/${clanId}/emojis`;
  async function send(method: "POST" | "DELETE", body: FormData | string) {
    try {
      const response = await fetch(endpoint, { method, body, headers: typeof body === "string" ? { "Content-Type": "application/json" } : undefined });
      const result = await response.json();
      if (!response.ok || !result.ok) { toast.error(result.error || "저장하지 못했습니다."); return; }
      if (method === "POST") { setName(""); if (input.current) input.current.value = ""; }
      toast.success(method === "POST" ? "공용 이모티콘을 추가했습니다." : "이모티콘을 삭제했습니다."); router.refresh();
    } catch { toast.error("요청 결과를 확인하지 못했습니다. 새로고침 후 확인해 주세요."); }
  }
  return <section id="clan-emojis" aria-labelledby="clan-emojis-heading" className="scroll-mt-4 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="clan-emojis-heading" className="flex items-center gap-2 text-sm font-semibold"><SmilePlus className="size-4 text-primary" aria-hidden />공용 이모티콘</h3><span className="text-xs tabular-nums text-muted-foreground">{emojis.length} / {slots}슬롯</span></div>
    {!slots && <p className="text-xs text-muted-foreground">클랜 상점에서 10슬롯을 구매한 뒤 이모티콘을 등록하세요. <Link className="text-primary hover:underline" href={`/games/${gameSlug}/clan/${clanId}/store`}>클랜 상점</Link></p>}
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="이모티콘 슬롯">{Array.from({ length: Math.max(slots, emojis.length, 10) }, (_, index) => {
      const emoji = emojis[index];
      return <div key={emoji?.id ?? index} className="relative flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background/30 p-2">
        {emoji && slots ? <Image src={clanEmojiUrl(clanId, emoji.id)} alt={emoji.name} width={40} height={40} unoptimized className="size-10 object-contain" /> : <span className="text-lg text-muted-foreground/40" aria-hidden>+</span>}
        <span className="max-w-full truncate text-[11px] text-muted-foreground">{emoji?.name ?? (slots ? "빈 슬롯" : "잠김")}</span>
        {emoji && canEdit && <Button type="button" size="icon-sm" variant="ghost" className="absolute right-0 top-0" disabled={pending} aria-label={`${emoji.name} 삭제`} onClick={() => start(() => send("DELETE", JSON.stringify({ id: emoji.id })))}><Trash2 className="size-3" aria-hidden /></Button>}
      </div>;
    })}</div>
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault(); const file = input.current?.files?.[0];
      if (!emojiNamePattern.test(name.trim())) { toast.error("이름은 한글·영문·숫자·밑줄로 2~32자 입력해 주세요."); return; }
      if (!file || !file.size || file.size > EMOJI_LIMIT || !["image/png", "image/webp", "image/jpeg"].includes(file.type)) { toast.error("PNG·WebP·JPG 이미지를 256KB 이내로 선택해 주세요."); return; }
      const body = new FormData(); body.set("name", name.trim()); body.set("image", file); start(() => send("POST", body));
    }}><p className="text-xs text-muted-foreground">정적 PNG·WebP·JPG · 최대 256KB · 128×128px로 변환 · 클랜 게시글 공감에 사용</p>
      <fieldset disabled={!canEdit || !slots || emojis.length >= slots || pending} className="flex min-w-0 flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 space-y-1.5 text-xs">이모티콘 이름<Input aria-label="이모티콘 이름" value={name} onChange={event => setName(event.target.value)} maxLength={32} placeholder="예: 환호_01" /></label>
        <label className="min-w-0 flex-1 space-y-1.5 text-xs">이미지<input ref={input} aria-label="이모티콘 이미지" type="file" accept="image/png,image/webp,image/jpeg" className="block w-full min-w-0 rounded-lg border border-input p-2 text-xs" /></label>
        <Button type="submit" size="sm">{pending ? "저장 중…" : "이모티콘 추가"}</Button>
      </fieldset>
    </form>
  </section>;
}
