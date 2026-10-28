"use client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setClanEmojiReaction } from "@/app/actions/clan-emoji-reactions";
import { clanEmojiUrl, type ClanEmoji, type ClanEmojiReaction } from "@/lib/clan/cosmetics";
export function ClanEmojiReactions({ gameSlug, clanId, postId, emojis, reactions }: { gameSlug: string; clanId: string; postId: string; emojis: ClanEmoji[]; reactions: ClanEmojiReaction[] }) {
  const [open, setOpen] = useState(false), [pending, start] = useTransition();
  const router = useRouter();
  if (!emojis.length) return null;
  function toggle(id: string) { setOpen(false); start(async () => {
    try { const result = await setClanEmojiReaction(gameSlug, clanId, postId, id, !reactions.some(row => row.emoji_id === id && row.mine)); if (!result.ok) toast.error(result.error); else router.refresh(); }
    catch { toast.error("공감을 저장하지 못했습니다. 다시 시도해 주세요."); }
  }); }
  return <div className="flex flex-wrap items-center gap-2" aria-label="클랜 이모티콘 공감">
    {emojis.map(emoji => { const row = reactions.find(r => r.emoji_id === emoji.id); return row && <Button key={emoji.id} size="sm" variant={row.mine ? "secondary" : "outline"} disabled={pending} aria-pressed={row.mine} aria-label={`${emoji.name} 공감 ${row.total}명`} onClick={() => toggle(emoji.id)}><Image unoptimized src={clanEmojiUrl(clanId, emoji.id)} alt="" width={24} height={24} />{row.total}</Button>; })}
    <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger render={<Button size="icon-sm" variant="ghost" disabled={pending} />} aria-label="클랜 이모티콘 선택"><SmilePlus className="size-4" aria-hidden /></Popover.Trigger><Popover.Portal><Popover.Positioner side="top" sideOffset={8} className="z-50"><Popover.Popup className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 shadow-lg"><Popover.Title className="mb-3 text-xs font-semibold">클랜 공용 이모티콘</Popover.Title><div className="grid grid-cols-5 gap-1">{emojis.map(emoji => <button type="button" key={emoji.id} aria-label={emoji.name + " 이모티콘"} title={emoji.name} className="flex size-10 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" onClick={() => toggle(emoji.id)}><Image src={clanEmojiUrl(clanId, emoji.id)} alt="" width={32} height={32} unoptimized /></button>)}</div></Popover.Popup></Popover.Positioner></Popover.Portal></Popover.Root>
  </div>;
}
