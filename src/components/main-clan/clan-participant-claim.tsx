"use client";

import { useState, useTransition } from "react";
import { requestClanParticipantLink } from "@/app/actions/clan-participants";
import { Button } from "@/components/ui/button";

export function ClanParticipantClaim({ token, requested }: { token: string; requested: boolean }) {
  const [sent, setSent] = useState(requested);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">본인의 참가자 기록인지 확인한 뒤 신청하세요. 운영진 확인 후 연결되며 클랜 가입·역할은 변경되지 않습니다.</p>
    {sent ? <p role="status" className="text-sm text-primary">연결 요청을 보냈습니다. 운영진 확인을 기다려 주세요.</p> : <Button disabled={pending} onClick={() => start(async () => {
      const result = await requestClanParticipantLink(token);
      if (!result.ok) { setError(result.error); return; } setSent(true);
    })}>{pending ? "신청 중" : "내 참가자 기록 연결 요청"}</Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
