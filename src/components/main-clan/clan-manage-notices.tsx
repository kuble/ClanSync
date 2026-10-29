"use client";
import { ClanEmojiInput } from "./clan-emoji-content";
import { HelpText } from "./help-text";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Megaphone, Pin, PinOff, Plus, Pencil, ScrollText, Trash2 } from "lucide-react";
import {
  saveClanNoticeAction,
  deleteClanNoticeAction,
  setClanNoticePinnedAction,
} from "@/app/actions/clan-notices";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClanRulesEditor } from "@/components/main-clan/clan-rules-editor";
import { parseClanRules } from "@/lib/clan/rules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

export type ManagedClanNotice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: string;
};
const panel = "rounded-xl border border-border bg-card p-5 sm:p-6";

export function ClanManageNotices({
  gameSlug,
  clanId,
  notices,
  loadFailed,
  canManage = true,
}: {
  gameSlug: string;
  clanId: string;
  notices: ManagedClanNotice[];
  loadFailed: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editor, setEditor] = useState<ManagedClanNotice | "new" | null>(null);
  const [noticeContent,setNoticeContent] = useState("");
  const [removing, setRemoving] = useState<ManagedClanNotice | null>(null);
  const editorReturnFocus = useRef<HTMLElement | null>(null);
  const editorPopup = useRef<HTMLDivElement | null>(null);
  const editorTitle = useRef<HTMLInputElement | null>(null);

  function edit(value: ManagedClanNotice | "new", trigger: HTMLElement) {
    editorReturnFocus.current = trigger;
    setNoticeContent(value === "new" ? "" : value.content);
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
        toast.error("저장하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
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
          <h3 id="manage-notices-title" className="flex items-center gap-2 text-sm font-bold">
            <Megaphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <HelpText label="클랜 공지" help="중요한 소식을 클랜원에게 전하십시오. 고정한 공지가 먼저 표시됩니다." />
          </h3>
        </div>
        {canManage && <Button
          type="button"
          size="sm"
          onClick={(event) => edit("new", event.currentTarget)}
        >
          <Plus className="size-3.5" />
          공지 작성
        </Button>}
      </div>
      {loadFailed ? (
        <p
          className="rounded-lg bg-destructive/5 p-5 text-sm text-destructive"
          role="alert"
        >
          공지를 불러오지 못했습니다. 새로고침 후 확인해 주십시오.
        </p>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
          <Megaphone
            className="mb-3 size-6 text-muted-foreground/60"
            aria-hidden="true"
          />
          <p className="text-[13px] font-semibold">아직 등록된 공지가 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            첫 공지로 클랜원에게 인사를 건네보십시오.
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
                  <Link href={"/games/"+gameSlug+"/clan/"+clanId+"/board/notices/"+notice.id} className="truncate hover:text-primary">{notice.title}</Link>
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {notice.author} ·{" "}
                  {new Intl.DateTimeFormat("ko-KR", {
                    timeZone: "Asia/Seoul",
                    dateStyle: "medium",
                  }).format(new Date(notice.createdAt))}
                </p>
              </div>
              {canManage && <div className="flex shrink-0 items-center gap-1">
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
                  title="공지 편집"
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
                  title="공지 삭제"
                  onClick={() => setRemoving(notice)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>}
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setEditor(null);
        }}
      >
        <SheetContent
          ref={editorPopup}
          className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[600px]"
          initialFocus={(interactionType) => {
            const popup = editorPopup.current;
            if (!popup || popup.contains(popup.ownerDocument.activeElement)) {
              return false;
            }
            // Base UI queues its default focus in a frame, which can steal focus
            // from a field the user has already started editing. Focus once now.
            (interactionType === "touch" ? popup : editorTitle.current)?.focus({
              preventScroll: true,
            });
            return false;
          }}
          finalFocus={editorReturnFocus}
          showCloseButton={!pending}
        >
          <SheetHeader className="shrink-0 px-5 pb-5 pr-12">
            <SheetTitle>
              {editor === "new" ? "공지 작성" : "공지 편집"}
            </SheetTitle>
            <SheetDescription>
              활동 중인 클랜원에게만 공개됩니다.
            </SheetDescription>
          </SheetHeader>
          <form
            key={typeof editor === "object" ? editor?.id : "new"}
            className="flex min-h-0 flex-1 flex-col"
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
            <fieldset disabled={pending} className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5">
            <div className="space-y-2">
              <Label htmlFor="notice-title">제목</Label>
              <Input
                ref={editorTitle}
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
              <ClanEmojiInput id="notice-content" name="content" label="본문" value={noticeContent} onChange={setNoticeContent} maxLength={20000} disabled={pending} placeholder="공지 내용을 입력해 주십시오." className="min-h-48"/>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              대시보드 상단에 고정
              <Switch
                name="is_pinned"
                defaultChecked={
                  editor && editor !== "new" ? editor.isPinned : false
                }
                disabled={pending}
              />
            </label>
            </fieldset>
            <SheetFooter className="mt-0 shrink-0 flex-row justify-end border-t px-5 py-4">
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
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>공지를 삭제하시겠습니까?</DialogTitle>
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
  canManage = true,
}: {
  gameSlug: string;
  clanId: string;
  initialRules: string | null;
  loadFailed: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [retrying, retry] = useTransition();
  if (loadFailed) {
    return (
      <section className={panel} id="rules" aria-labelledby="manage-rules-title">
        <h3 id="manage-rules-title" className="flex items-center gap-2 text-sm font-bold"><ScrollText className="size-4 shrink-0 text-primary" aria-hidden="true" />클랜 규칙</h3>
        <p className="my-4 text-sm text-destructive" role="alert">
          기존 규칙을 불러오지 못했습니다. 다시 불러온 뒤 수정해 주십시오.
        </p>
        <Button type="button" variant="outline" size="sm" disabled={retrying}
          onClick={() => retry(() => router.refresh())}>
          {retrying ? "불러오는 중…" : "규칙 다시 불러오기"}
        </Button>
      </section>
    );
  }
  if (!canManage) {
    const rules = parseClanRules(initialRules);
    return <section className={panel} id="rules" aria-labelledby="manage-rules-title"><h3 id="manage-rules-title" className="flex items-center gap-2 text-sm font-bold"><ScrollText className="size-4 shrink-0 text-primary" aria-hidden="true" />클랜 규칙</h3>
      {rules.length ? <ol aria-label="클랜 규칙 목록" className="mt-4 divide-y divide-border">{rules.map((rule, index) => <li key={index} className="flex gap-3 py-3 text-sm leading-6"><span aria-hidden="true" className="w-5 shrink-0 text-muted-foreground">{index + 1}.</span><p className="min-w-0 flex-1 break-words">{rule}</p></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">등록된 규칙이 없습니다.</p>}
    </section>;
  }
  // Mount the editor only after a successful read, including after a retry.
  return <ClanRulesEditor key={clanId} gameSlug={gameSlug} clanId={clanId} initialRules={initialRules} />;
}
