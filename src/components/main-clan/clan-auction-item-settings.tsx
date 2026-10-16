"use client";
import { Switch } from "@/components/ui/switch";
import { HelpText } from "./help-text";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addClanAuctionItemExamplesAction,
  deleteClanAuctionItemAction,
  saveClanAuctionItemAction,
} from "@/app/actions/clan-auction-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auctionItemValidationError, type ClanAuctionItem } from "@/lib/balance/auction-items";
import { cn } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };

export function ClanAuctionItemSettings({ gameSlug, clanId, items, loadError = false, onChange, onSaved, disabled = false }: {
  gameSlug: string;
  clanId: string;
  items: ClanAuctionItem[];
  loadError?: boolean;
  onChange?: (items: ClanAuctionItem[]) => void;
  onSaved?: () => Promise<void>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [saving, startTransition] = useTransition();
  const pending = saving || disabled;
  const [editor, setEditor] = useState<ClanAuctionItem | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const activeCount = items.filter((item) => item.enabled).length;

  function run(action: () => Promise<Result>, message: string, closeEditor = false) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) { toast.error(result.error); return; }
        if (closeEditor) setEditor(null);
        setDeleteId(null);
        await onSaved?.();
        toast.success(message);
        if (!onChange) router.refresh();
      } catch {
        toast.error("연결을 확인한 뒤 다시 시도하세요. 입력한 내용은 유지됩니다.");
      }
    });
  }

  async function saveItem(id: string | null, item: Omit<ClanAuctionItem, "id">): Promise<Result> {
    if (!onChange) return saveClanAuctionItemAction(gameSlug, clanId, id, item);
    const error = auctionItemValidationError(item);
    if (error) return { ok: false, error };
    if (!id && items.length >= 30) return { ok: false, error: "내전 전용 아이템은 최대 30개까지 등록할 수 있습니다." };
    if (items.some((entry) => entry.id !== id && entry.name.trim().toLowerCase() === item.name.trim().toLowerCase()))
      return { ok: false, error: "같은 이름의 아이템이 있습니다." };
    const next = { ...item, id: id ?? crypto.randomUUID(), name: item.name.trim(), description: item.description.trim() };
    onChange(id ? items.map((entry) => entry.id === id ? next : entry) : [...items, next]);
    return { ok: true };
  }

  async function deleteItem(id: string): Promise<Result> {
    if (!onChange) return deleteClanAuctionItemAction(gameSlug, clanId, id);
    onChange(items.filter((item) => item.id !== id));
    return { ok: true };
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = {
      name: String(data.get("name") ?? ""),
      description: String(data.get("description") ?? ""),
      cost: Number(data.get("cost")),
      enabled: data.get("enabled") === "on",
    };
    run(() => saveItem(editor && editor !== "new" ? editor.id : null, item), onChange ? "구성에 반영했습니다. 설정 적용을 눌러 저장하세요." : "아이템을 저장했습니다.", true);
  }

  return (
    <section id="auction-items" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Gift className="size-4" aria-hidden="true" /></span>
          <div>
            <h3 className="text-sm font-bold"><HelpText label={onChange ? "이 내전 아이템" : "클랜 기본 아이템"} help={onChange ? "이 깜짝 내전에서만 사용합니다. 설정 적용을 누르면 저장되며 같은 방의 다음 경기에도 이어집니다." : "클랜의 정규·깜짝 내전에 공통으로 제공하는 아이템입니다. 변경은 다음 경매부터 반영합니다."} /></h3>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={pending || loadError} onClick={() => { setEditor("new"); setDeleteId(null); }}><Plus className="size-3.5" aria-hidden="true" />아이템 추가</Button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={cn("font-medium", !onChange && activeCount < 3 ? "text-amber-500" : "text-primary")}>사용 중 {activeCount}개{!onChange && activeCount < 3 && " · 3개 이상 등록하면 사용할 수 있습니다."}</span>
      </div>
      {loadError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">아이템 목록을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">{onChange ? "이 내전에서 쓸 아이템을 추가해 보세요." : "클랜만의 아이템과 가격을 등록해 보세요."}</p>
          {!onChange && <Button className="mt-3" variant="secondary" size="sm" disabled={pending} onClick={() => run(() => addClanAuctionItemExamplesAction(gameSlug, clanId), "예시 아이템 3개를 추가했습니다.")}>예시 아이템 추가</Button>}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="px-3 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="min-w-0 flex-1">
                  <p className={cn("break-words text-sm font-semibold", !item.enabled && "text-muted-foreground")}>{item.name}</p>
                  {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums">{item.cost.toLocaleString("ko-KR")}<span className="ml-0.5 text-xs font-normal text-muted-foreground">pt</span></span>
                <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                  <button type="button" role="switch" aria-label={`${item.name} 사용`} aria-checked={item.enabled} disabled={pending} className={cn("relative mr-1 h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", item.enabled ? "border-primary bg-primary" : "border-input bg-muted")} onClick={() => run(() => saveItem(item.id, { name: item.name, description: item.description, cost: item.cost, enabled: !item.enabled }), item.enabled ? "아이템 사용을 껐습니다." : "아이템 사용을 켰습니다.")}>
                    <span aria-hidden="true" className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", item.enabled ? "translate-x-5" : "translate-x-0")} />
                  </button>
                  <Button variant="ghost" size="icon-sm" aria-label={`${item.name} 수정`} disabled={pending} onClick={() => { setEditor(item); setDeleteId(null); }}><Pencil className="size-3.5" aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`${item.name} 삭제`} disabled={pending} onClick={() => setDeleteId(item.id)}><Trash2 className="size-3.5" aria-hidden="true" /></Button>
                </div>
              </div>
              {deleteId === item.id && <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-xs"><span className="mr-auto text-muted-foreground">이 아이템을 삭제할까요?</span><Button variant="ghost" size="sm" disabled={pending} onClick={() => setDeleteId(null)}>취소</Button><Button variant="destructive" size="sm" disabled={pending} onClick={() => run(() => deleteItem(item.id), "아이템을 삭제했습니다.")}>삭제</Button></div>}
            </li>
          ))}
        </ul>
      )}
      {editor && (
        <form key={editor === "new" ? "new" : editor.id} onSubmit={save} className="mt-4 space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4" aria-label={editor === "new" ? "아이템 추가" : "아이템 수정"}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div className="space-y-2"><Label htmlFor="auction-item-name">아이템 이름</Label><Input id="auction-item-name" name="name" required maxLength={80} defaultValue={editor === "new" ? "" : editor.name} placeholder="예: 맵 선정권" disabled={pending} autoFocus /></div>
            <div className="space-y-2"><Label htmlFor="auction-item-cost">가격 (pt)</Label><Input id="auction-item-cost" name="cost" type="number" min={0} max={100000} step={10} required defaultValue={editor === "new" ? 100 : editor.cost} disabled={pending} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="auction-item-description">설명과 적용 방법</Label><textarea id="auction-item-description" name="description" maxLength={500} rows={3} defaultValue={editor === "new" ? "" : editor.description} placeholder="권한의 범위와 적용 방법을 적어 주세요." disabled={pending} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50" /></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><Switch name="enabled" defaultChecked={editor === "new" || editor.enabled} disabled={pending} />경매에 사용</label><div className="flex gap-2"><Button variant="ghost" type="button" disabled={pending} onClick={() => setEditor(null)}>취소</Button><Button type="submit" disabled={pending}>{pending ? "저장 중…" : "아이템 저장"}</Button></div></div>
        </form>
      )}
    </section>
  );
}
