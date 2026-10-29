"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveClanRulesAction } from "@/app/actions/clan-notices";
import { parseClanRules } from "@/lib/clan/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ClanRulesEditor({ gameSlug, clanId, initialRules }: { gameSlug: string; clanId: string; initialRules: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rules, setRules] = useState(() => parseClanRules(initialRules));
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [pending, start] = useTransition();

  function save(next: string[], afterSave: () => void) {
    const serialized = next.join("\n");
    if (serialized.length > 20000) {
      toast.error("전체 규칙은 20,000자 이내로 입력해 주십시오.");
      return;
    }
    start(async () => {
      try {
        const result = await saveClanRulesAction(gameSlug, clanId, serialized);
        if (!result.ok) { toast.error(result.error); return; }
        setRules(next);
        afterSave();
        toast.success("클랜 규칙을 저장했습니다.");
        router.refresh();
      } catch { toast.error("규칙을 저장하지 못했습니다. 다시 시도해 주십시오."); }
    });
  }

  return <section className="rounded-xl border border-border bg-card p-5 sm:p-6" id="rules" aria-labelledby="manage-rules-title" aria-busy={pending}>
    <h3 id="manage-rules-title" className="flex items-center gap-2 text-sm font-bold"><ScrollText className="size-4 shrink-0 text-primary" aria-hidden="true" />클랜 규칙</h3>
    {rules.length ? <ol aria-label="클랜 규칙 목록" className="mt-4 divide-y divide-border">
      {rules.map((rule, index) => <li key={index} className="flex items-start gap-3 py-3">
        <span aria-hidden="true" className="w-5 shrink-0 text-sm leading-6 tabular-nums text-muted-foreground">{index + 1}.</span>
        <p className="min-w-0 flex-1 break-words text-sm leading-6">{rule}</p>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`${index + 1}번 규칙 수정`} disabled={pending} onClick={() => { setEditing(index); setEditDraft(rule); }}><Pencil aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`${index + 1}번 규칙 삭제`} disabled={pending} className="text-destructive" onClick={() => setDeleting(index)}><Trash2 aria-hidden="true" /></Button>
        </div>
      </li>)}
    </ol> : <p className="my-4 text-sm text-muted-foreground">등록된 규칙이 없습니다.</p>}
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={event => {
      event.preventDefault();
      const rule = parseClanRules(draft).join(" ");
      if (pending || !rule) return;
      save([...rules, rule], () => { setDraft(""); input.current?.focus(); });
    }}>
      <Label htmlFor="clan-rule-new" className="sr-only">새 규칙</Label>
      <Input ref={input} id="clan-rule-new" value={draft} onChange={event => setDraft(event.target.value)} readOnly={pending} maxLength={20000} autoComplete="off" placeholder="규칙을 하나씩 입력해 주십시오." className="h-9 flex-1" />
      <Button type="submit" size="lg" disabled={pending || !parseClanRules(draft).length}><Plus aria-hidden="true" />규칙 추가</Button>
    </form>
    <p className="mt-2 text-[11px] text-muted-foreground">{rules.join("\n").length.toLocaleString()} / 20,000자</p>

    <Dialog open={editing !== null} onOpenChange={open => { if (!open && !pending) setEditing(null); }}>
      <DialogContent className="sm:max-w-lg">
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          const rule = parseClanRules(editDraft).join(" ");
          if (pending || editing === null || !rule) return;
          save(rules.map((value, index) => index === editing ? rule : value), () => setEditing(null));
        }}>
          <DialogHeader><DialogTitle>규칙 수정</DialogTitle><DialogDescription className="sr-only">선택한 규칙의 내용을 수정합니다.</DialogDescription></DialogHeader>
          <Label htmlFor="clan-rule-edit" className="sr-only">규칙 내용</Label>
          <Input id="clan-rule-edit" value={editDraft} onChange={event => setEditDraft(event.target.value)} readOnly={pending} maxLength={20000} autoFocus />
          <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending}>취소</Button>} /><Button type="submit" disabled={pending || !parseClanRules(editDraft).length}>{pending ? "저장 중…" : "저장"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={deleting !== null} onOpenChange={open => { if (!open && !pending) setDeleting(null); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>이 규칙을 삭제하시겠습니까?</DialogTitle><DialogDescription className="max-h-40 overflow-y-auto break-words">{deleting !== null ? rules[deleting] : ""}</DialogDescription></DialogHeader>
        <DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={pending}>취소</Button>} /><Button type="button" variant="destructive" disabled={pending} onClick={() => { if (deleting !== null) save(rules.filter((_, index) => index !== deleting), () => setDeleting(null)); }}>{pending ? "삭제 중…" : "삭제"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
