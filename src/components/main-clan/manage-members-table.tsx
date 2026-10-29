"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsUp, ShieldMinus, UserRoundMinus, UserRoundCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  kickClanMemberAction,
  setClanMemberRoleAction,
  allowClanRejoinAction,
  transferClanLeadershipAction,
} from "@/app/actions/clan-manage-members";
import { Button } from "@/components/ui/button";
import { MemberRecordButton } from "./participant-record-dialog";
import { RubberSegment } from "@/components/ui/rubber-segment";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ManageMemberRow = {
  userId: string;
  nickname: string;
  gameVerified: boolean;
  gameTag: string | null;
  linkedCount: number;
  status: "active" | "left" | "banned";
  departureKind: string | null;
  departedLabel: string;
  role: "leader" | "officer" | "member";
  joinedLabel: string;
  lastActivityAt?: string | null;
  actions: {
    canKick: boolean;
    canPromote: boolean;
    canDemote: boolean;
    canAllowRejoin: boolean;
    canTransferLeadership: boolean;
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
  const [scope, setScope] = useState<"current" | "former">("current");
  const [allowing, setAllowing] = useState<ManageMemberRow | null>(null);
  const [allowError, setAllowError] = useState("");
  const [transferring, setTransferring] = useState<ManageMemberRow | null>(null);
  const [successorId, setSuccessorId] = useState("");
  const [transferError, setTransferError] = useState("");
  const successors = rows.filter(row => row.status === "active" && row.role !== "leader");
  const [filter, setFilter] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
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
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    inactive: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dormant: "bg-muted text-muted-foreground",
    unknown: "text-muted-foreground",
  };
  const filtered = rows.filter(
    (row) =>
      (scope === "current" ? row.status === "active" : row.status !== "active") &&
      (filter === "all" || (scope === "current" ? activity(row) : row.status) === filter) &&
      `${row.nickname} ${row.gameTag ?? ""}`
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
    if (!window.confirm(`${nickname} 님을 클랜에서 내보냅니다. 계속하시겠습니까?`)) {
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
    if (!window.confirm(`${label} 계속하시겠습니까?`)) return;
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
      <RubberSegment label="구성원 구분" labelPosition="hidden" value={scope} onChange={(next) => { setScope(next); setFilter("all"); setPageIndex(0); }} options={[
        { id: "current", label: "현재 구성원", badge: rows.filter((row) => row.status === "active").length },
        { id: "former", label: "이전 구성원", badge: rows.filter((row) => row.status !== "active").length },
      ]} />
      {scope === "current" && <div className="flex flex-wrap gap-2">
        {(["active", "inactive", "dormant"] as const).map((key) => (
          <span
            key={key}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${activityClass[key]}`}
          >
            {activityLabels[key]}{" "}
            {rows.filter((row) => row.status === "active" && activity(row) === key).length}명
          </span>
        ))}
        <span className="self-center text-[11px] text-muted-foreground">
          최근 활동 기준 · 비활성 30일 · 휴면 60일
        </span>
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="구성원 검색"
            placeholder="닉네임 검색"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPageIndex(0);
            }}
            className="pl-9"
          />
        </div>
        <select
          aria-label={scope === "current" ? "활동 상태" : "재가입 상태"}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPageIndex(0);
          }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
        >
          <option value="all">전체</option>
          {scope === "current" ? <><option value="active">활성만</option><option value="inactive">비활성만</option><option value="dormant">휴면만</option></> : <><option value="left">재가입 가능</option><option value="banned">재가입 차단</option></>}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground border-b text-xs font-medium uppercase">
            <tr>
              <th className="px-3 py-2">닉네임</th>
              <th className="px-3 py-2">게임 인증</th>
              <th className="px-3 py-2">{scope === "current" ? "활동 상태" : "상태"}</th>
              <th className="px-3 py-2">{scope === "current" ? "역할" : "이전 역할"}</th>
              <th className="px-3 py-2">가입</th>
              {scope === "former" && <th className="whitespace-nowrap px-3 py-2">탈퇴·강퇴일</th>}
              <th className="px-3 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.userId} className="border-b last:border-0">
                <td className="px-3 py-3 font-medium">
                  <Link
                    href={`/games/${gameSlug}/clan/${clanId}/stats?player=${encodeURIComponent(m.userId)}`}
                    prefetch={false}
                    aria-label={`${m.nickname} 개인 기록`}
                    className="rounded-sm text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {m.nickname}
                  </Link>
                  {m.gameTag && <p className="mt-1 text-xs font-normal text-muted-foreground">{m.gameTag}</p>}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className={`whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${m.gameVerified ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{m.gameVerified ? "인증 완료" : "미인증"}</span>
                </td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  <span
                    className={`whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${scope === "current" ? activityClass[activity(m)] : m.status === "banned" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                  >
                    {scope === "current" ? activityLabels[activity(m)] : m.status === "banned" ? "강퇴 · 재가입 차단" : m.departureKind === "kicked" ? "강퇴 · 재가입 허용" : m.departureKind === "left" ? "자진 탈퇴" : "탈퇴"}
                  </span>
                </td>
                <td className="px-3 py-2">{roleLabel(m.role)}</td>
                <td className="text-muted-foreground px-3 py-2 text-xs">
                  {m.joinedLabel}
                </td>
                {scope === "former" && <td className="px-3 py-2 text-xs text-muted-foreground">{m.departedLabel}</td>}
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {m.status === "active" && <MemberRecordButton clanId={clanId} gameSlug={gameSlug} userId={m.userId} nickname={m.nickname} gameTag={m.gameTag} linkedCount={m.linkedCount} />}
                    {m.actions.canAllowRejoin && <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={`${m.nickname} 재가입 허용`} title="재가입 허용" onClick={() => { setAllowError(""); setAllowing(m); }}><UserRoundCheck aria-hidden="true" /></Button>}
                    {m.actions.canTransferLeadership && <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={`${m.nickname} 클랜장 위임 후 멤버로 강등`} title="클랜장 위임 후 멤버로 강등" onClick={() => { setTransferError(""); setSuccessorId(""); setTransferring(m); }}><ShieldMinus aria-hidden="true" /></Button>}
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
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          aria-label={`${m.nickname} 운영진 승격`}
                          title="운영진 승격"
                        >
                          <ChevronsUp aria-hidden="true" />
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
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          aria-label={`${m.nickname} 멤버로 강등`}
                          title="멤버로 강등"
                        >
                          <ShieldMinus aria-hidden="true" />
                        </Button>
                      </form>
                    ) : null}
                    {m.actions.canKick ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        disabled={pending}
                        aria-label={`${m.nickname} 강퇴`}
                        title="강퇴"
                        onClick={() => onKick(m.userId, m.nickname)}
                      >
                        <UserRoundMinus aria-hidden="true" />
                      </Button>
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
      <Dialog open={!!transferring} onOpenChange={(open) => { if (!open && !pending) setTransferring(null); }}>
        <DialogContent showCloseButton={!pending}><DialogHeader><DialogTitle>클랜장 위임 및 강등</DialogTitle><DialogDescription>새 클랜장을 선택하십시오. 위임 후 본인은 멤버로 변경되며 클랜장 전용 권한을 사용할 수 없습니다.</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium">새 클랜장<select className="min-h-11 min-w-0 rounded-md border bg-background px-3 text-sm" value={successorId} disabled={pending} onChange={event => { setSuccessorId(event.target.value); setTransferError(""); }}><option value="">구성원을 선택하십시오.</option>{successors.map(row => <option key={row.userId} value={row.userId}>{row.nickname} · {roleLabel(row.role)}</option>)}</select></label>
          {!successors.length && <p className="text-sm text-muted-foreground">위임할 활성 구성원이 없습니다. 다른 구성원이 가입한 뒤 위임할 수 있습니다.</p>}
          {transferError && <p role="alert" className="text-sm text-destructive">{transferError}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={pending} onClick={() => setTransferring(null)}>취소</Button><Button disabled={pending || !successorId} onClick={() => {
            if (!transferring || !successorId) return;
            start(async () => {
              try {
                const result = await transferClanLeadershipAction(gameSlug, clanId, successorId);
                if (!result.ok) { setTransferError(result.error); return; }
                setTransferring(null); toast.success("클랜장을 위임했습니다. 본인의 역할은 멤버로 변경되었습니다.");
                router.replace(`/games/${gameSlug}/clan/${clanId}`); router.refresh();
              } catch { setTransferError("위임하지 못했습니다. 연결을 확인하고 다시 시도해 주십시오."); }
            });
          }}>{pending ? "위임 중…" : "위임하고 멤버로 변경"}</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!allowing} onOpenChange={(open) => { if (!open && !pending) setAllowing(null); }}>
        <DialogContent showCloseButton={!pending}><DialogHeader><DialogTitle>재가입을 허용하시겠습니까?</DialogTitle><DialogDescription>{allowing?.nickname} 님이 다시 가입 신청을 보낼 수 있습니다. 가입은 신청 후 운영진이 별도로 승인합니다.</DialogDescription></DialogHeader>
          {allowError && <p role="alert" className="text-xs text-destructive">{allowError}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><Button size="sm" variant="outline" disabled={pending} onClick={() => setAllowing(null)}>취소</Button><Button size="sm" disabled={pending} onClick={() => {
            if (!allowing) return;
            start(async () => {
              const result = await allowClanRejoinAction(gameSlug, clanId, allowing.userId);
              if (!result.ok) { setAllowError(result.error); return; }
              setAllowing(null); toast.success("재가입을 허용했습니다. 가입 신청 후 승인이 필요합니다."); router.refresh();
            });
          }}>{pending ? "처리 중…" : "재가입 허용"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
