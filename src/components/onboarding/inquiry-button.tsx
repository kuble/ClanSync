"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClanCommentComposer, ClanComments, type ClanComment } from "@/components/main-clan/clan-comments";
import { StatsScrollArea } from "@/components/main-clan/stats-scroll-area";

type InquiryMessage = Omit<ClanComment, "id" | "content" | "reactions" | "emojiReactions"> & { id: number; body: string };
type Room = { messages: InquiryMessage[] };

export function InquiryButton({ clanId }: { clanId: string }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>클랜 문의방</DialogTrigger>
    {open && <DialogContent className="flex h-[min(36rem,calc(100dvh-2rem))] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <InquiryConversation key={clanId} clanId={clanId} />
    </DialogContent>}
  </Dialog>;
}

function InquiryConversation({ clanId }: { clanId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [draft, setDraft] = useState("");
  const [readError, setReadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [busy, setBusy] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const writing = useRef(false);
  const version = useRef(0);

  const accept = useCallback((data: Room, sent = false) => {
    const el = viewport.current;
    followLatest.current = sent || !el || el.scrollHeight - el.clientHeight - el.scrollTop < 32;
    setRoom(data);
    setReadError("");
  }, []);

  const handleFailure = useCallback((code: string, fallback: string, writingMessage = false) => {
    if (code === "42501" || code === "PGRST301" || code === "PGRST303") {
      setRoom(null);
      setDraft("");
      setWriteError("");
      setReadError("이 문의방에 접근할 수 없습니다.");
    } else if (writingMessage) setWriteError(fallback);
    else setReadError(fallback);
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      const before = version.current;
      if (!writing.current) {
        const { data, error } = await createClient().rpc("clan_inquiry", { p_clan_id: clanId }).abortSignal(controller.signal);
        if (!active) return;
        if (version.current === before) {
          if (error) handleFailure(error.code, "대화를 불러오지 못했습니다.");
          else accept(data as Room);
        }
      }
      timer = setTimeout(refresh, 4000);
    }
    void refresh();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [clanId, accept, handleFailure]);

  useLayoutEffect(() => {
    if (followLatest.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [room]);

  async function send() {
    if (!room || writing.current) return;
    writing.current = true;
    version.current++;
    setBusy(true);
    setWriteError("");
    try {
      const { data, error } = await createClient().rpc("clan_inquiry", { p_clan_id: clanId, p_body: draft.trim() });
      if (error) {
        handleFailure(error.code, "메시지를 보내지 못했습니다.", true);
        return;
      }
      accept(data as Room, true);
      setDraft("");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return <>
    <DialogHeader className="flex-row items-center gap-3 border-b px-5 py-4 pr-12">
      <MessageSquare className="size-4 shrink-0 text-primary" aria-hidden />
      <DialogTitle>클랜 문의방</DialogTitle>
      <span className="ml-auto text-xs text-muted-foreground">신청 대기자 · 운영진</span>
    </DialogHeader>
    <StatsScrollArea viewportRef={viewport} label="문의 대화" className="min-h-0 flex-1 overscroll-contain px-3 py-2 sm:px-5">
      {room?.messages.length ? <ClanComments textOnly
        comments={room.messages.map(message => ({ ...message, id: String(message.id), content: message.body }))}
      /> : <p role="status" className="py-10 text-center text-sm text-muted-foreground">
        {room ? "첫 메시지를 남겨 보세요." : !readError && "대화를 불러오는 중입니다."}
      </p>}
    </StatsScrollArea>
    {(readError || writeError) && <p role="alert" className="px-5 py-2 text-xs text-destructive">{writeError || readError}</p>}
    {room && <div className="shrink-0 border-t bg-card px-4 py-3">
      <ClanCommentComposer textOnly label="문의 메시지" submitLabel="보내기" placeholder="메시지를 입력하세요."
        value={draft} onChange={setDraft} onSubmit={send} disabled={busy} maxLength={1000} />
    </div>}
  </>;
}
