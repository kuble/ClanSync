"use client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setClanEmojiTargetReaction } from "@/app/actions/clan-emoji-reactions";
import { clanEmojiUrl, type ClanEmoji, type ClanEmojiReaction } from "@/lib/clan/cosmetics";
import type { EmojiReactionTarget } from "@/lib/clan/emoji-text";
import { ClanEmojiPicker, useClanEmojis } from "./clan-emoji-content";

export function ClanEmojiReactions({ gameSlug, clanId, postId, target, emojis: supplied, reactions, standardOptions = [], onStandardSelect, pickerLabel = "클랜 이모티콘 선택" }: {
  pickerLabel?: string; gameSlug?: string; clanId: string; postId?: string; target?: EmojiReactionTarget; emojis?: ClanEmoji[]; reactions: ClanEmojiReaction[];
  standardOptions?: readonly {value:string;emoji:string;label:string}[]; onStandardSelect?: (value:string)=>void;
}) {
  const context = useClanEmojis();
  const emojis = supplied ?? context.emojis;
  const [pending,start] = useTransition();
  const scope = target ?? {kind:"post" as const,id:postId??""};
  const baseline=scope.kind+scope.id+JSON.stringify(reactions);
  const [updated,setUpdated] = useState<{baseline:string;rows:typeof reactions}>();
  const rows = updated?.baseline === baseline ? updated.rows : reactions;
  if (!emojis.length && !standardOptions.length) return null;
  function toggle(id:string) { start(async()=>{
    try {
      const result=await setClanEmojiTargetReaction(gameSlug??context.gameSlug,clanId,scope,id,!rows.some(row=>row.emoji_id===id&&row.mine));
      if(!result.ok)toast.error(result.error); else if("reactions" in result)setUpdated({baseline,rows:result.reactions!});
    } catch {toast.error("공감을 저장하지 못했습니다. 다시 시도해 주세요.");}
  }); }
  return <div className="flex flex-wrap items-center gap-1.5" aria-label="클랜 이모티콘 공감">
    {emojis.map(emoji=>{const row=rows.find(r=>r.emoji_id===emoji.id);return row&&<Button key={emoji.id} size="sm" variant={row.mine?"secondary":"outline"} disabled={pending} aria-pressed={row.mine} aria-label={`${emoji.name} 공감 ${row.total}명`} onClick={()=>toggle(emoji.id)}><Image unoptimized src={clanEmojiUrl(clanId,emoji.id)} alt="" width={24} height={24} className="size-6 object-contain"/>{row.total}</Button>;})}
    <ClanEmojiPicker label={pickerLabel} title="공감 선택" disabled={pending} options={standardOptions} onSelect={(value,emoji)=>{if(emoji)toggle(emoji.id);else onStandardSelect?.(value);}}/>
  </div>;
}
