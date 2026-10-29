"use client";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition, type ComponentProps, type ReactElement } from "react";
import { toast } from "sonner";
import { setClanEmojiTargetReaction } from "@/app/actions/clan-emoji-reactions";
import { clanEmojiUrl, type ClanEmoji, type ClanEmojiReaction } from "@/lib/clan/cosmetics";
import type { EmojiReactionTarget } from "@/lib/clan/emoji-text";
import { ClanEmojiPicker, useClanEmojis } from "./clan-emoji-content";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ReactionPeopleResult = { ok: true; names: string[] } | { ok: false; error: string };

export function EmojiReactionButton({ count, children, loadPeople, ...props }: ComponentProps<"button"> & { count: number; loadPeople?: () => Promise<ReactionPeopleResult> }) {
  const button = <button type="button" {...props} title={loadPeople ? undefined : props.title} className="inline-flex h-8 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-full border bg-background/40 px-2 text-[11px] tabular-nums text-muted-foreground transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary">
    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center text-xl leading-none">{children}</span>
    <span>{count}</span>
  </button>;
  return loadPeople ? <ReactionPeopleTooltip button={button} count={count} loadPeople={loadPeople} /> : button;
}

function ReactionPeopleTooltip({ button, count, loadPeople }: { button: ReactElement; count: number; loadPeople: () => Promise<ReactionPeopleResult> }) {
  const [people, setPeople] = useState<{ names?: string[]; error?: string }>({});
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function showPeople(open: boolean) {
    const current = ++request.current;
    if (!open) return;
    setPeople({});
    try {
      const result = await loadPeople();
      if (current === request.current) setPeople(result.ok ? { names: result.names } : { error: result.error });
    } catch {
      if (current === request.current) setPeople({ error: "공감한 멤버를 불러오지 못했습니다." });
    }
  }
  return <Tooltip onOpenChange={open => { void showPeople(open); }}>
    <TooltipTrigger render={button} />
    <TooltipContent role="tooltip" className="max-w-56 flex-col items-start gap-1.5">
      <span className="font-semibold">공감한 멤버</span>
      {people.names ? people.names.length ? <ul aria-label="공감한 멤버" className="max-h-48 space-y-1 overflow-y-auto break-words">
        {people.names.map((name, index) => <li key={index}>{name}</li>)}
        {count > people.names.length && <li>외 {count - people.names.length}명</li>}
      </ul> : <span>공감이 없습니다.</span> : <span role="status">{people.error ?? "불러오는 중…"}</span>}
    </TooltipContent>
  </Tooltip>;
}

export function ClanEmojiReactions({ gameSlug, clanId, postId, target, emojis: supplied, reactions, standardOptions = [], onStandardSelect, pickerLabel = "클랜 이모티콘 선택", loadPeople, disabled = false }: {
  pickerLabel?: string; gameSlug?: string; clanId: string; postId?: string; target?: EmojiReactionTarget; emojis?: ClanEmoji[]; reactions: ClanEmojiReaction[];
  standardOptions?: readonly {value:string;emoji:string;label:string}[]; onStandardSelect?: (value:string)=>void;
  loadPeople?: (emojiId: string) => Promise<ReactionPeopleResult>;
  disabled?: boolean;
}) {
  const context = useClanEmojis();
  const emojis = supplied ?? context.emojis;
  const [pending,start] = useTransition();
  const scope = target ?? {kind:"post" as const,id:postId??""};
  const baseline=scope.kind+scope.id+JSON.stringify(reactions);
  const [updated,setUpdated] = useState<{baseline:string;rows:typeof reactions}>();
  const rows = updated?.baseline === baseline ? updated.rows : reactions;
  if (!emojis.length && !standardOptions.length) return null;
  function toggle(id:string) { if (disabled || pending) return; start(async()=>{
    try {
      const result=await setClanEmojiTargetReaction(gameSlug??context.gameSlug,clanId,scope,id,!rows.some(row=>row.emoji_id===id&&row.mine));
      if(!result.ok)toast.error(result.error); else if("reactions" in result)setUpdated({baseline,rows:result.reactions!});
    } catch {toast.error("공감을 저장하지 못했습니다. 다시 시도해 주세요.");}
  }); }
  return <div className="flex flex-wrap items-center gap-1.5" aria-label="클랜 이모티콘 공감">
    {emojis.map(emoji=>{const row=rows.find(r=>r.emoji_id===emoji.id);return row&&<EmojiReactionButton key={emoji.id} count={row.total} disabled={disabled || pending} aria-pressed={row.mine} aria-label={`${emoji.name} 공감 ${row.total}명`} loadPeople={loadPeople ? () => loadPeople(emoji.id) : undefined} onClick={()=>toggle(emoji.id)}><Image unoptimized src={clanEmojiUrl(clanId,emoji.id)} alt="" width={20} height={20} className="size-5 object-contain"/></EmojiReactionButton>;})}
    <ClanEmojiPicker label={pickerLabel} title="공감 선택" disabled={disabled || pending} options={standardOptions} onSelect={(value,emoji)=>{if(emoji)toggle(emoji.id);else onStandardSelect?.(value);}}/>
  </div>;
}
