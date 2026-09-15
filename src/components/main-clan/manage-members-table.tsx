"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  lastActivityAt?: string | null;
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [detail, setDetail] = useState<ManageMemberRow | null>(null);
  const [now] = useState(() => Date.now());
  function activity(row: ManageMemberRow) {
    if (!row.lastActivityAt) return "unknown";
    const days = Math.max(
      0,
      (now - new Date(row.lastActivityAt).getTime()) / 86400000,
    );
    return days < 30 ? "active" : days < 60 ? "inactive" : "dormant";
  }
  const activityLabels: Record<string, string> = {
    active: "활성",
    inactive: "비활성",
    dormant: "휴면",
    unknown: "활동 기록 없음",
  };
  const activityClass: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    inactive: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dormant: "bg-muted text-muted-foreground",
    unknown: "text-muted-foreground",
  };
  const filtered = rows.filter(
    (row) =>
      (filter === "all" || activity(row) === filter) &&
      `${row.nickname} ${row.email}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visible = filtered.slice(currentPage * 10, (currentPage + 1) * 10);

  function roleLabel(role: ManageMemberRow["role"]): string {
    if (role === "leader") return "클랜장";
    if (role === "officer") return "운영진";
    return "멤버";
  }

  function onKick(targetUserId: string, nickname: string) {
    if (!window.confirm(`${nickname} 님을 클랜에서 내보냅니다. 계속할까요?`)) {
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["active", "inactive", "dormant"] as const).map((key) => (
          <span
            key={key}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${activityClass[key]}`}
          >
            {activityLabels[key]}{" "}
            {rows.filter((row) => activity(row) === key).length}명
          </span>
        ))}
        <span className="self-center text-[11px] text-muted-foreground">
          최근 활동 기준 · 비활성 30일 · 휴면 60일
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="구성원 검색"
            placeholder="닉네임·이메일 검색"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPageIndex(0);
            }}
            className="pl-9"
          />
        </div>
        <select
          aria-label="활동 상태"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPageIndex(0);
          }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
        >
          <option value="all">전체</option>
          <option value="active">활성만</option>
          <option value="inactive">비활성만</option>
          <option value="dormant">휴면만</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {filtered.length}명
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium uppercase">
            <tr>
              <th className="px-3 py-2">닉네임</th>
              <th className="px-3 py-2">활동 상태</th>
              <th className="px-3 py-2">역할</th>
              <th className="px-3 py-2">가입</th>
              <th className="px-3 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.userId} className="border-b last:border-0">
                <td className="px-3 py-3 font-medium">
                  <button
                    type="button"
                    className="text-left hover:text-primary"
                    onClick={() => setDetail(m)}
                  >
                    {m.nickname}
                  </button>
                  <p className="mt-1 text-[11px] font-normal text-muted-foreground">
                    {m.email}
                  </p>
                </td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-medium ${activityClass[activity(m)]}`}
                  >
                    {activityLabels[activity(m)]}
                  </span>
                </td>
                <td className="px-3 py-2">{roleLabel(m.role)}</td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  {m.joinedLabel}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {m.actions.canPromote ? (
                      <form onSubmit={onPromote} className="inline">
                        <input
                          type="hidden"
                          name="target_user_id"
                          value={m.userId}
                        />
                        <input
                          type="hidden"
                          name="nickname"
                          value={m.nickname}
                        />
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
                        <input
                          type="hidden"
                          name="target_user_id"
                          value={m.userId}
                        />
                        <input
                          type="hidden"
                          name="nickname"
                          value={m.nickname}
                        />
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
        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            조건에 맞는 멤버가 없습니다.
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="이전 구성원 페이지"
          disabled={currentPage === 0}
          onClick={() => setPageIndex(currentPage - 1)}
        >
          <ChevronLeft />
        </Button>
        {currentPage + 1} / {pageCount}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="다음 구성원 페이지"
          disabled={currentPage >= pageCount - 1}
          onClick={() => setPageIndex(currentPage + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.nickname}</DialogTitle>
            <DialogDescription>클랜 구성원 정보</DialogDescription>
          </DialogHeader>
          {detail && (
            <dl className="grid grid-cols-[6rem_1fr] gap-y-4 text-sm">
              <dt className="text-muted-foreground">역할</dt>
              <dd>{roleLabel(detail.role)}</dd>
              <dt className="text-muted-foreground">이메일</dt>
              <dd className="break-all">{detail.email}</dd>
              <dt className="text-muted-foreground">가입일</dt>
              <dd>{detail.joinedLabel}</dd>
              <dt className="text-muted-foreground">최근 활동</dt>
              <dd>
                {detail.lastActivityAt
                  ? new Intl.DateTimeFormat("ko-KR", {
                      timeZone: "Asia/Seoul",
                      dateStyle: "medium",
                    }).format(new Date(detail.lastActivityAt))
                  : "활동 기록이 없습니다."}
              </dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
