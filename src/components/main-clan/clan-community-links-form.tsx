"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ExternalLink, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { updateClanCommunityLinksAction } from "@/app/actions/clan-community-links";
import { CHAT_SERVICES, normalizeChatInviteUrl, parseClanCommunityLinks, type ClanCommunityLinks } from "@/lib/clan/community-links";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChatServiceIcon } from "./chat-service-icon";

export function ClanCommunityLinksForm({ gameSlug, clanId, initialLinks, canEdit, discordConnected }: { gameSlug: string; clanId: string; initialLinks: ClanCommunityLinks; canEdit: boolean; discordConnected: boolean }) {
  const [links, setLinks] = useState(initialLinks);
  const [saved, setSaved] = useState(initialLinks);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const dirty = CHAT_SERVICES.some(({ id }) => links[id] !== saved[id]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    const parsed = parseClanCommunityLinks(links);
    if (!parsed.ok) { setError(parsed.error); return; }
    setError("");
    const form = new FormData();
    CHAT_SERVICES.forEach(({ id }) => form.set(id, links[id]));
    start(async () => {
      try {
        const result = await updateClanCommunityLinksAction(gameSlug, clanId, form);
        if (!result.ok) { setError(result.error); return; }
        setLinks(result.links); setSaved(result.links);
        toast.success("채팅방 링크를 저장했습니다.");
      } catch { setError("채팅방 링크를 저장하지 못했습니다. 다시 시도해 주십시오."); }
    });
  }
  return <section aria-labelledby="clan-community-links-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5">
    <h4 id="clan-community-links-heading" className="flex items-center gap-2 text-sm font-semibold"><MessagesSquare className="size-4 text-primary" aria-hidden />클랜 채팅방</h4>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">등록한 초대 링크는 대시보드에 아이콘으로 표시됩니다.</p>
    <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
      <div className="grid gap-4 lg:grid-cols-2">
        {CHAT_SERVICES.map(({ id, label, example }) => {
          if (id === "discord" && discordConnected) return <div key={id} className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium"><ChatServiceIcon service="discord" />Discord</div>
            <a href={`/games/${gameSlug}/clan/${clanId}/discord`} target="_blank" rel="noopener noreferrer" aria-label="Discord 열기" className="flex h-8 items-center justify-between gap-2 rounded-lg border border-input bg-muted/30 px-3 text-xs text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><span>봇 연결됨 · 자동 입장</span><ExternalLink className="size-3.5 shrink-0" aria-hidden /></a>
          </div>;
          const href = normalizeChatInviteUrl(id, links[id]);
          return <div key={id} className="min-w-0 space-y-2">
            <Label htmlFor={`chat-${id}`} className="flex items-center gap-2 text-xs"><ChatServiceIcon service={id} />{label}</Label>
            <div className="flex min-w-0 gap-2">
              <Input id={`chat-${id}`} name={id} type="url" maxLength={2000} autoComplete="off" spellCheck={false} placeholder={example} value={links[id]} readOnly={!canEdit} disabled={pending} onChange={event => { setLinks(current => ({ ...current, [id]:event.target.value })); setError(""); }} aria-describedby={error ? "chat-links-error" : undefined} className="min-w-0 flex-1" />
              {href && <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} 열기`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><ExternalLink className="size-3.5" aria-hidden /></a>}
            </div>
          </div>;
        })}
      </div>
      {error && <p id="chat-links-error" role="alert" className="text-xs text-destructive">{error}</p>}
      {canEdit ? <div className="flex justify-end"><Button type="submit" size="sm" disabled={pending || !dirty}>{pending ? "저장 중…" : "링크 저장"}</Button></div> : <p className="text-xs text-muted-foreground">채팅방 링크는 클랜장이 변경할 수 있습니다.</p>}
    </form>
  </section>;
}
