"use client";

import { useActionState } from "react";
import { joinClanByInvite } from "@/app/actions/clan-invites";
import { Button } from "@/components/ui/button";

export function ClanInviteJoin({ token }: { token: string }) {
  const [state, action, pending] = useActionState(joinClanByInvite, { error: null });
  return <form action={action} className="space-y-4">
    <input type="hidden" name="token" value={token} />
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Button type="submit" disabled={pending} className="w-full">{pending ? "가입 중…" : "바로 가입"}</Button>
  </form>;
}
