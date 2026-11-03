"use client";

import { useTranslator } from "#use-translator";
import { useActionState } from "react";
import { joinClanByInvite } from "@/app/actions/clan-invites";
import { Button } from "@/components/ui/button";

export function ClanInviteJoin({ token }: { token: string }) {
  const tx = useTranslator();
  const [state, action, pending] = useActionState(joinClanByInvite, { error: null });
  return <form action={action} className="space-y-4">
    <input type="hidden" name="token" value={token} />
    {state.error && <p role="alert" className="text-sm text-destructive">{tx(state.error)}</p>}
    <Button type="submit" disabled={pending} className="w-full">{pending ? tx("가입 중…") : tx("바로 가입")}</Button>
  </form>;
}
