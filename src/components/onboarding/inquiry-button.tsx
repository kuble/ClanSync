"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Room = { expires: string; messages: { id: number; applicant: boolean; body: string }[] };

export function InquiryButton({requestId}: {requestId: string}) {
  const [open,setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>클랜 문의방</DialogTrigger>
    {open && <DialogContent><DialogHeader><DialogTitle>클랜 문의방</DialogTitle></DialogHeader>
      <InquiryConversation requestId={requestId} />
    </DialogContent>}
  </Dialog>;
}

function InquiryConversation({requestId}: {requestId: string}) {
  const [room,setRoom] = useState<Room | null>(null);
  const [draft,setDraft] = useState("");
  const [error,setError] = useState("");
  const [sending,setSending] = useState(false);
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const version = ++revision.current;
      const result = await createClient().rpc("join_inquiry",{p_request:requestId});
      if (!active || version !== revision.current) return;
      if (result.error) {
        setRoom(null);
        setError(result.error.code === "P0002" ? "24시간이 지나 문의방이 종료되었습니다." : result.error.code === "42501" ? "이 문의방에 접근할 수 없습니다." : "문의를 불러오지 못했습니다.");
        return;
      }
      setRoom(result.data as Room);
      setError("");
    }
    void refresh();
    const timer = setInterval(refresh,4000);
    return () => { active=false; clearInterval(timer); };
  },[requestId]);
  return <>
    {room && <><p className="text-xs text-muted-foreground">{new Date(room.expires).toLocaleString("ko-KR")} 종료</p>
    <ul className="grid max-h-[40svh] gap-3 overflow-y-auto text-sm" aria-label="문의 대화">
      {room.messages.length === 0 && <li>첫 메시지를 남겨 보세요.</li>}
      {room.messages.map(m => <li key={m.id}><strong className="block text-xs">{m.applicant ? "신청자" : "클랜 운영진"}</strong><span className="whitespace-pre-wrap break-all">{m.body}</span></li>)}
    </ul>
    <form className="flex gap-2" onSubmit={async event=>{
      event.preventDefault();
      if (!draft.trim() || sending) return;
      setSending(true);
      try {
        const result=await createClient().rpc("join_inquiry",{p_request:requestId,p_body:draft.trim()});
        ++revision.current;
        if (result.error) { setError("메시지를 보내지 못했습니다."); return; }
        setRoom(result.data as Room); setDraft(""); setError("");
      } finally { setSending(false); }
    }}>
      <input aria-label="문의 메시지" placeholder="메시지 입력" className="min-w-0 flex-1 rounded-lg border px-3" value={draft} maxLength={1000} disabled={sending} onChange={e=>setDraft(e.target.value)} />
      <Button type="submit" disabled={!draft.trim() || sending}>보내기</Button>
    </form></>}
    {error ? <p role="alert">{error}</p> : !room && <p role="status">대화를 불러오는 중입니다.</p>}
  </>;
}
