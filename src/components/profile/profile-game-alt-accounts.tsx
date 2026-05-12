"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addUserAltAccountAction,
  deleteUserAltAccountAction,
} from "@/app/actions/profile-alt-accounts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AltAccountRow = {
  id: string;
  game_id: string;
  alt_nick: string;
  note: string | null;
};

type Props = {
  gameId: string;
  gameSlug: string;
  /** 같은 게임 활성 클랜 소속별 부계 노출 요약 한 줄 이상 — 없으면 비소속만 안내 */
  disclosureLines: string[];
  initialRows: AltAccountRow[];
};

export function ProfileGameAltAccounts({
  gameId,
  gameSlug,
  disclosureLines,
  initialRows,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);

  function onAddSubmit() {
    start(async () => {
      const r = await addUserAltAccountAction({
        gameId,
        altNick: nick,
        note,
        acknowledgedDisclosure: agreed,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("부계동을 추가했습니다.");
      setNick("");
      setNote("");
      setAgreed(false);
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete(id: string, label: string) {
    const ok = typeof window !== "undefined" ?
      window.confirm(`「${label}」 목록에서 삭제할까요?`)
    : false;
    if (!ok) return;
    start(async () => {
      const r = await deleteUserAltAccountAction({ id });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제했습니다.");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "bg-muted/30 space-y-3 rounded-xl border p-4 mt-8",
      )}
      data-alt-accounts-panel={gameSlug}
    >
      <div>
        <h3 className="text-sm font-semibold tracking-tight">부계동 (자기신고)</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          같은 게임의 추가 계정을 기록하면 내전 통계 등이 헷갈리지 않게 안내합니다. 증빙 없이 신고되는
          닉이라는 점 참고해 주세요.
        </p>
      </div>

      {disclosureLines.length > 0 ? (
        <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs leading-relaxed">
          {disclosureLines.map((line, i) => (
            <li key={`${i}:${line.slice(0, 24)}`}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          현재 이 게임에 소속 중인 활성 클랜이 없다면 다른 사람에게는 보이지 않습니다 (본인만 조회).
        </p>
      )}

      {initialRows.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {initialRows.map((r) => (
            <li
              key={r.id}
              className="bg-background flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
              data-alt-account-row={gameSlug}
            >
              <div>
                <p className="font-medium">{r.alt_nick}</p>
                {r.note ?
                  <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                    {r.note}
                  </p>
                : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => void onDelete(r.id, r.alt_nick)}
              >
                삭제
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">등록된 부계동이 없습니다.</p>
      )}

      {open ?
        <div className="space-y-3 border-t pt-3">
          <p className="text-muted-foreground border-l-foreground/35 rounded-sm border-l-2 pl-3 text-xs leading-relaxed">
            등록한 부계동은 자기신고입니다.{" "}
            <strong>클랜에 속해 있는 경우</strong>, 클랜에 설정된 「부계동 조회」권한에 따라{" "}
            <strong>같은 클랜의 운영진 또는 구성원에게 공개될 수 있습니다</strong>. 「클랜 관리」의
            운영 권한에서 확인할 수 있습니다.
          </p>
          <label className="block text-xs">
            <span className="text-muted-foreground">부계 동 닉네임</span>
            <input
              type="text"
              value={nick}
              disabled={pending}
              maxLength={32}
              onChange={(e) => setNick(e.target.value)}
              className={cn(
                "border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm",
                "focus-visible:ring-ring outline-none focus-visible:ring-2",
              )}
              placeholder="배틀태그 형식 예: Player#1234"
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">메모 (선택)</span>
            <textarea
              value={note}
              disabled={pending}
              maxLength={500}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
              className={cn(
                "border-input bg-background mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm",
                "focus-visible:ring-ring outline-none focus-visible:ring-2",
              )}
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed">
            <input
              type="checkbox"
              checked={agreed}
              disabled={pending}
              onChange={(e) => setAgreed(e.target.checked)}
              className="accent-primary mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              위 공개 안내 내용과 자기신고 성격을 이해했고, 필요 시 같은 클랜원에게 노출되는 것을
              동의합니다.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                pending ||
                nick.trim().length < 1 ||
                !agreed
              }
              onClick={() => void onAddSubmit()}
            >
              추가
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setNick("");
                setNote("");
                setAgreed(false);
              }}
            >
              취소
            </Button>
          </div>
        </div>
      : (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          + 부계동 추가
        </Button>
      )}
    </div>
  );
}
