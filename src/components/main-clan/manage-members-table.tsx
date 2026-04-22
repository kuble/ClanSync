"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  kickClanMemberAction,
  setClanMemberRoleAction,
} from "@/app/actions/clan-manage-members";
import { Button } from "@/components/ui/button";

export type ManageMemberRow = {
  userId: string;
  nickname: string;
  email: string;
  role: "leader" | "officer" | "member";
  joinedLabel: string;
  actions: {
    canKick: boolean;
    canPromote: boolean;
    canDemote: boolean;
  };
};

export function ManageMembersTable({
  gameSlug,
  clanId,
  rows,
}: {
  gameSlug: string;
  clanId: string;
  rows: ManageMemberRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function roleLabel(role: ManageMemberRow["role"]): string {
    if (role === "leader") return "클랜장";
    if (role === "officer") return "운영진";
    return "멤버";
  }

  function onKick(targetUserId: string, nickname: string) {
    if (
      !window.confirm(
        `${nickname} 님을 클랜에서 내보냅니다. 계속할까요?`,
      )
    ) {
      return;
    }
    start(async () => {
      const r = await kickClanMemberAction(gameSlug, clanId, targetUserId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("처리했습니다.");
      router.refresh();
    });
  }

  function onSetRole(
    targetUserId: string,
    newRole: "officer" | "member",
    label: string,
  ) {
    if (!window.confirm(`${label} 계속할까요?`)) return;
    start(async () => {
      const r = await setClanMemberRoleAction(
        gameSlug,
        clanId,
        targetUserId,
        newRole,
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("역할을 변경했습니다.");
      router.refresh();
    });
  }

  function onPromote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetUserId = String(fd.get("target_user_id") ?? "");
    const nickname = String(fd.get("nickname") ?? "");
    onSetRole(targetUserId, "officer", `${nickname} 님을 운영진으로 승격`);
  }

  function onDemote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const targetUserId = String(fd.get("target_user_id") ?? "");
    const nickname = String(fd.get("nickname") ?? "");
    onSetRole(targetUserId, "member", `${nickname} 님을 멤버로 강등`);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium uppercase">
          <tr>
            <th className="px-3 py-2">닉네임</th>
            <th className="px-3 py-2">이메일</th>
            <th className="px-3 py-2">역할</th>
            <th className="px-3 py-2">가입</th>
            <th className="px-3 py-2 text-right">작업</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.userId} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{m.nickname}</td>
              <td className="text-muted-foreground px-3 py-2 text-xs">
                {m.email}
              </td>
              <td className="px-3 py-2">{roleLabel(m.role)}</td>
              <td className="text-muted-foreground px-3 py-2 text-xs">
                {m.joinedLabel}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {m.actions.canPromote ? (
                    <form onSubmit={onPromote} className="inline">
                      <input type="hidden" name="target_user_id" value={m.userId} />
                      <input type="hidden" name="nickname" value={m.nickname} />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        aria-label={`${m.nickname} 운영진 승격`}
                      >
                        승격
                      </Button>
                    </form>
                  ) : null}
                  {m.actions.canDemote ? (
                    <form onSubmit={onDemote} className="inline">
                      <input type="hidden" name="target_user_id" value={m.userId} />
                      <input type="hidden" name="nickname" value={m.nickname} />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        aria-label={`${m.nickname} 멤버로 강등`}
                      >
                        강등
                      </Button>
                    </form>
                  ) : null}
                  {m.actions.canKick ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      aria-label={`${m.nickname} 강퇴`}
                      onClick={() => onKick(m.userId, m.nickname)}
                    >
                      강퇴
                    </Button>
                  ) : null}
                  {!m.actions.canKick &&
                  !m.actions.canPromote &&
                  !m.actions.canDemote ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
