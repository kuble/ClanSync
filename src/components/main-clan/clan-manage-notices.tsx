"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Pin, PinOff, Plus, Pencil, Trash2 } from "lucide-react";
import {
  saveClanNoticeAction,
  deleteClanNoticeAction,
  setClanNoticePinnedAction,
  saveClanRulesAction,
} from "@/app/actions/clan-notices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export type ManagedClanNotice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: string;
};
const panel = "rounded-xl border border-border bg-card p-5";

export function ClanManageNotices({
  gameSlug,
  clanId,
  notices,
  loadFailed,
}: {
  gameSlug: string;
  clanId: string;
  notices: ManagedClanNotice[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editor, setEditor] = useState<ManagedClanNotice | "new" | null>(null);
  const [removing, setRemoving] = useState<ManagedClanNotice | null>(null);
  const editorReturnFocus = useRef<HTMLElement | null>(null);

  function edit(value: ManagedClanNotice | "new", trigger: HTMLElement) {
    editorReturnFocus.current = trigger;
    setEditor(value);
  }
  function mutate(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    message: string,
    onDone?: () => void,
  ) {
    start(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(message);
        onDone?.();
        router.refresh();
      } catch {
        toast.error("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }
  return (
    <section
      className={panel}
      id="notices"
      aria-labelledby="manage-notices-title"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="manage-notices-title" className="text-sm font-bold">
            클랜 공지
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            중요한 소식을 클랜원에게 전하세요. 고정한 공지가 먼저 표시됩니다.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={(event) => edit("new", event.currentTarget)}
        >
          <Plus className="size-3.5" />
          공지 작성
        </Button>
      </div>
      {loadFailed ? (
        <p
          className="rounded-lg bg-destructive/5 p-5 text-sm text-destructive"
          role="alert"
        >
          공지를 불러오지 못했습니다. 새로고침 후 확인해 주세요.
        </p>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
          <Megaphone
            className="mb-3 size-6 text-muted-foreground/60"
            aria-hidden="true"
          />
          <p className="text-[13px] font-semibold">아직 등록된 공지가 없어요</p>
          <p className="mt-1 text-xs text-muted-foreground">
            첫 공지로 클랜원에게 인사를 건네보세요.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {notices.map((notice) => (
            <li
              key={notice.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-1 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  {notice.isPinned && (
                    <Pin
                      className="size-3.5 shrink-0 text-primary"
                      aria-label="고정 공지"
                    />
                  )}
                  <span className="truncate">{notice.title}</span>
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {notice.author} ·{" "}
                  {new Intl.DateTimeFormat("ko-KR", {
                    timeZone: "Asia/Seoul",
                    dateStyle: "medium",
                  }).format(new Date(notice.createdAt))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={`${notice.title} ${notice.isPinned ? "고정 해제" : "고정"}`}
                  onClick={() =>
                    mutate(
                      () =>
                        setClanNoticePinnedAction(
                          gameSlug,
                          clanId,
                          notice.id,
                          !notice.isPinned,
                        ),
                      notice.isPinned
                        ? "고정을 해제했습니다."
                        : "공지를 고정했습니다.",
                    )
                  }
                >
                  {notice.isPinned ? <PinOff /> : <Pin />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={`${notice.title} 편집`}
                  onClick={(event) => edit(notice, event.currentTarget)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={`${notice.title} 삭제`}
                  onClick={() => setRemoving(notice)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setEditor(null);
        }}
      >
        <DialogContent
          className="sm:max-w-xl"
          finalFocus={editorReturnFocus}
          showCloseButton={!pending}
        >
          <DialogHeader>
            <DialogTitle>
              {editor === "new" ? "공지 작성" : "공지 편집"}
            </DialogTitle>
            <DialogDescription>
              활동 중인 클랜원에게만 공개됩니다.
            </DialogDescription>
          </DialogHeader>
          <form
            key={typeof editor === "object" ? editor?.id : "new"}
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const id = editor && editor !== "new" ? editor.id : null;
              mutate(
                () => saveClanNoticeAction(gameSlug, clanId, id, data),
                "공지를 저장했습니다.",
                () => setEditor(null),
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="notice-title">제목</Label>
              <Input
                id="notice-title"
                name="title"
                required
                maxLength={200}
                defaultValue={editor && editor !== "new" ? editor.title : ""}
                disabled={pending}
                placeholder="클랜원에게 전할 소식"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice-content">본문</Label>
              <textarea
                id="notice-content"
                name="content"
                required
                maxLength={20000}
                rows={9}
                defaultValue={editor && editor !== "new" ? editor.content : ""}
                disabled={pending}
                className="max-h-[40vh] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="공지 내용을 입력해 주세요."
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="is_pinned"
                defaultChecked={
                  editor && editor !== "new" ? editor.isPinned : false
                }
                disabled={pending}
                className="size-4 accent-primary"
              />
              대시보드 상단에 고정
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setEditor(null)}
              >
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중…" : "공지 저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>공지를 삭제할까요?</DialogTitle>
            <DialogDescription>
              ‘{removing?.title}’ 공지가 삭제됩니다. 삭제한 공지는 복구할 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              취소
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (removing)
                  mutate(
                    () => deleteClanNoticeAction(gameSlug, clanId, removing.id),
                    "공지를 삭제했습니다.",
                    () => setRemoving(null),
                  );
              }}
            >
              {pending ? "삭제 중…" : "공지 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function ClanManageRules({
  gameSlug,
  clanId,
  initialRules,
  loadFailed,
}: {
  gameSlug: string;
  clanId: string;
  initialRules: string | null;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const [retrying, retry] = useTransition();
  if (loadFailed) {
    return (
      <section className={panel} id="rules" aria-labelledby="manage-rules-title">
        <h3 id="manage-rules-title" className="text-sm font-bold">클랜 규칙</h3>
        <p className="my-4 text-sm text-destructive" role="alert">
          기존 규칙을 불러오지 못했습니다. 다시 불러온 뒤 수정해 주세요.
        </p>
        <Button type="button" variant="outline" size="sm" disabled={retrying}
          onClick={() => retry(() => router.refresh())}>
          {retrying ? "불러오는 중…" : "규칙 다시 불러오기"}
        </Button>
      </section>
    );
  }
  // Mount the editor only after a successful read, including after a retry.
  return <ClanRulesEditor gameSlug={gameSlug} clanId={clanId} initialRules={initialRules} />;
}

function ClanRulesEditor({
  gameSlug,
  clanId,
  initialRules,
}: {
  gameSlug: string;
  clanId: string;
  initialRules: string | null;
}) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules ?? "");
  const [pending, start] = useTransition();
  return (
    <section className={panel} id="rules" aria-labelledby="manage-rules-title">
      <h3 id="manage-rules-title" className="text-sm font-bold">
        클랜 규칙
      </h3>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">
        우리 클랜이 함께 지킬 약속을 적어주세요.
      </p>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            try {
              const result = await saveClanRulesAction(gameSlug, clanId, rules);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("클랜 규칙을 저장했습니다.");
              router.refresh();
            } catch {
              toast.error("규칙을 저장하지 못했습니다. 다시 시도해 주세요.");
            }
          });
        }}
      >
        <Label htmlFor="clan-rules" className="sr-only">
          클랜 규칙
        </Label>
        <textarea
          id="clan-rules"
          rows={7}
          maxLength={20000}
          value={rules}
          onChange={(event) => setRules(event.target.value)}
          disabled={pending}
          placeholder="예: 서로 존중하며 플레이해요. 내전 일정은 미리 알려주세요."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">
            {rules.length.toLocaleString()} / 20,000자
          </span>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "저장 중…" : "규칙 저장"}
          </Button>
        </div>
      </form>
    </section>
  );
}
