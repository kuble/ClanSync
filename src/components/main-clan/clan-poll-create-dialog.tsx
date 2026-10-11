"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
import { Bell, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClanPollAction } from "@/app/actions/clan-polls";
import {
  validatePollNotifyAgainstDeadline,
  type PollNotifyRepeat,
} from "@/lib/clan/poll-notify-validation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function deadlineAfter(hours: number) {
  const date = new Date(Math.ceil((Date.now() + hours * 3_600_000) / 60_000) * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const reminderHints: Record<Exclude<PollNotifyRepeat, "none">, string> = {
  once: "투표 시작 후와 마감 1시간 전에 알려요. 마감까지 최소 1시간이 필요합니다.",
  daily: "매일 선택한 시각에 알려요. 마감까지 최소 48시간이 필요합니다.",
  weekly: "매주 선택한 시각에 알려요. 마감까지 최소 14일이 필요합니다.",
  until_deadline_daily: "마감 전 24시간 동안 선택한 시각에 알려요. 마감까지 최소 24시간이 필요합니다.",
};

export function ClanPollCreateDialog({ gameSlug, clanId, onOpenChange }: {
  gameSlug: string;
  clanId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState([{ id: 0, label: "" }, { id: 1, label: "" }]);
  const nextOptionId = useRef(2);
  const focusOptionId = useRef<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [deadline, setDeadline] = useState(() => deadlineAfter(48));
  const [deadlinePreset, setDeadlinePreset] = useState<number | null>(48);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyRepeat, setNotifyRepeat] = useState<Exclude<PollNotifyRepeat, "none">>("once");
  const [notifyHour, setNotifyHour] = useState("9");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function clearError(id: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSubmitError(null);
  }

  function addOption() {
    if (options.length >= 12) return;
    const id = nextOptionId.current++;
    focusOptionId.current = id;
    setOptions((current) => [...current, { id, label: "" }]);
  }

  function removeOption(id: number) {
    if (options.length <= 2) return;
    const index = options.findIndex((option) => option.id === id);
    focusOptionId.current = options[index + 1]?.id ?? options[index - 1].id;
    setOptions((current) => current.filter((option) => option.id !== id));
    setErrors({});
    setSubmitError(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors["poll-title"] = "투표 질문을 입력해 주세요.";
    const labels = new Set<string>();
    for (const option of options) {
      const label = option.label.trim();
      if (!label) nextErrors[`poll-option-${option.id}`] = options.length > 2
        ? "선택지를 입력하거나 이 항목을 삭제해 주세요."
        : "선택지 내용을 입력해 주세요.";
      else if (labels.has(label)) nextErrors[`poll-option-${option.id}`] = "다른 선택지와 같은 내용입니다. 내용을 바꿔 주세요.";
      labels.add(label);
    }
    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      nextErrors["poll-deadline"] = "마감 날짜와 시간을 입력해 주세요.";
    } else {
      const validation = validatePollNotifyAgainstDeadline(Date.now(), deadlineDate.getTime(), notifyEnabled ? notifyRepeat : "none");
      if (!validation.ok) nextErrors["poll-deadline"] = validation.error;
    }
    setErrors(nextErrors);
    setSubmitError(null);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      formRef.current?.querySelector<HTMLElement>(`#${firstError}`)?.focus();
      return;
    }

    const data = new FormData(event.currentTarget);
    data.set("title", title.trim());
    data.set("deadline_local", deadlineDate.toISOString());
    data.set("notify_repeat", notifyEnabled ? notifyRepeat : "none");
    data.set("notify_hour", notifyHour);
    if (multipleChoice) data.set("multiple_choice", "on");
    options.forEach((option) => data.append("option_label", option.label.trim()));
    start(async () => {
      try {
        const result = await createClanPollAction(gameSlug, clanId, data);
        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }
        toast.success("투표가 시작되었습니다.");
        onOpenChange(false);
        router.refresh();
      } catch {
        setSubmitError("투표를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  const inputErrorProps = (id: string) => ({
    "aria-invalid": !!errors[id],
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open); }}>
      <DialogContent initialFocus={titleRef} showCloseButton={false} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="text-lg font-semibold">투표 만들기</DialogTitle>
          <DialogDescription className="text-xs">질문과 선택지를 작성해 보세요. 만들면 바로 투표가 시작됩니다.</DialogDescription>
        </DialogHeader>
        <Button type="button" variant="ghost" size="icon-sm" className="absolute right-3 top-4" disabled={pending} onClick={() => onOpenChange(false)} aria-label="닫기">
          <X className="size-4" aria-hidden />
        </Button>
        <form ref={formRef} noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <fieldset disabled={pending} className="min-w-0 space-y-6 px-5 py-5 sm:px-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="poll-title" className="font-semibold">투표 질문</Label>
                <span className="text-[11px] tabular-nums text-muted-foreground">{title.length}/120</span>
              </div>
              <Input ref={titleRef} id="poll-title" name="title" value={title} onChange={(event) => { setTitle(event.target.value); clearError("poll-title"); }} maxLength={120} placeholder="예: 이번 주 내전은 언제 할까요?" className="h-11" {...inputErrorProps("poll-title")} />
              <FieldError id="poll-title" errors={errors} />
            </div>

            <section className="space-y-3" aria-label="선택지 작성">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">선택지</h3>
                <span className="text-[11px] text-muted-foreground">2~12개 · 항목당 80자</span>
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={option.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                      <Input id={`poll-option-${option.id}`} ref={(node) => { if (node && focusOptionId.current === option.id) { node.focus(); focusOptionId.current = null; } }} aria-label={`선택지 ${index + 1}`} value={option.label} maxLength={80} placeholder={index === 0 ? "예: 금요일 오후 9시" : index === 1 ? "예: 토요일 오후 8시" : `선택지 ${index + 1}`} className="h-10 min-w-0 flex-1" onChange={(event) => { setOptions((current) => current.map((row) => row.id === option.id ? { ...row, label: event.target.value } : row)); setErrors({}); setSubmitError(null); }} {...inputErrorProps(`poll-option-${option.id}`)} />
                      <Button type="button" variant="ghost" size="icon-sm" disabled={pending || options.length <= 2} onClick={() => removeOption(option.id)} aria-label={`선택지 ${index + 1} 삭제`}>
                        <X className="size-4 text-muted-foreground" aria-hidden />
                      </Button>
                    </div>
                    <FieldError id={`poll-option-${option.id}`} errors={errors} className="pl-7" />
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="ml-7" disabled={pending || options.length >= 12} onClick={addOption}>
                <Plus className="size-3.5" aria-hidden />선택지 추가
                <span className="text-[11px] tabular-nums text-muted-foreground">{options.length}/12</span>
              </Button>
            </section>

            <section className="space-y-3 border-t pt-5" aria-label="마감 설정">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="poll-deadline" className="font-semibold">마감 일시</Label>
                <span className="text-[11px] text-muted-foreground">기기 시간 기준</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[[24, "1일 후"], [48, "2일 후"], [168, "1주 후"]].map(([hours, label]) => (
                  <Button key={hours} type="button" size="sm" variant="outline" aria-pressed={deadlinePreset === hours} className={cn("h-8 text-xs", deadlinePreset === hours && "border-primary/40 bg-primary/10 text-primary")} onClick={() => { setDeadline(deadlineAfter(Number(hours))); setDeadlinePreset(Number(hours)); clearError("poll-deadline"); }}>{label}</Button>
                ))}
              </div>
              <Input id="poll-deadline" name="deadline_local" type="datetime-local" value={deadline} className="h-10 w-full min-w-0" onChange={(event) => { setDeadline(event.target.value); setDeadlinePreset(null); clearError("poll-deadline"); }} {...inputErrorProps("poll-deadline")} />
              <FieldError id="poll-deadline" errors={errors} />
            </section>

            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-semibold">투표 방식</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ multiple: false, label: "하나만 선택" }, { multiple: true, label: "여러 개 선택" }].map((mode) => (
                  <label key={mode.label} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-xs transition-colors", multipleChoice === mode.multiple ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40")}>
                    <input type="radio" name="poll_choice_mode" value={mode.multiple ? "multiple" : "single"} checked={multipleChoice === mode.multiple} onChange={() => setMultipleChoice(mode.multiple)} className="size-3.5 accent-primary" />{mode.label}
                  </label>
                ))}
              </div>
              <PollToggle id="poll-anonymous" name="anonymous" label="익명 투표" description="누가 투표했는지 이름을 공개하지 않아요." checked={anonymous} onChange={setAnonymous} />
            </fieldset>

            <section className="space-y-3 border-t pt-4" aria-label="참여 알림 설정">
              <PollToggle id="poll-notify-enabled" name="poll_notify_enabled" label="참여 알림 보내기" description="클랜 멤버에게 사이트 알림으로 참여를 알려요." checked={notifyEnabled} onChange={(enabled) => { setNotifyEnabled(enabled); clearError("poll-deadline"); }} />
              {notifyEnabled ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium"><Bell className="size-3.5 text-muted-foreground" aria-hidden />사이트 알림</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="poll-notify-repeat" className="text-xs">알림 빈도</Label>
                      <select id="poll-notify-repeat" value={notifyRepeat} onChange={(event) => { setNotifyRepeat(event.target.value as Exclude<PollNotifyRepeat, "none">); clearError("poll-deadline"); }} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                        <option value="once">기본 (시작 · 마감 1시간 전)</option>
                        <option value="daily">매일</option>
                        <option value="weekly">매주</option>
                        <option value="until_deadline_daily">마감 전 24시간 동안</option>
                      </select>
                    </div>
                    {notifyRepeat !== "once" ? (
                      <div className="space-y-2">
                        <Label htmlFor="poll-notify-hour" className="text-xs">알림 시각 (한국 시간)</Label>
                        <select id="poll-notify-hour" value={notifyHour} onChange={(event) => setNotifyHour(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                          {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
                        </select>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{reminderHints[notifyRepeat]}</p>
                </div>
              ) : null}
              <p className="text-[11px] leading-relaxed text-muted-foreground">Discord 시작·종료 알림은 <Link href={`/games/${gameSlug}/clan/${clanId}/manage?tab=notifications`} className="underline underline-offset-2">클랜 알림 설정</Link>을 따릅니다.</p>
            </section>
          </fieldset>
          </div>
          <div className="shrink-0 space-y-3 border-t bg-background px-5 py-4 sm:px-6">
            {submitError ? <p role="alert" className="text-xs text-destructive">{submitError}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>취소</Button>
              <Button type="submit" disabled={pending}>{pending ? "투표 만드는 중…" : "투표 시작하기"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ id, errors, className }: { id: string; errors: Record<string, string>; className?: string }) {
  return errors[id] ? <p id={`${id}-error`} role="alert" className={cn("text-xs text-destructive", className)}>{errors[id]}</p> : null;
}

function PollToggle({ id, name, label, description, checked, onChange }: {
  id: string; name: string; label: string; description: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="space-y-1"><span className="block text-sm font-medium">{label}</span><span id={`${id}-description`} className="block text-xs leading-relaxed text-muted-foreground">{description}</span></span>
      <span className="relative flex h-6 w-11 shrink-0 items-center">
        <input id={id} type="checkbox" role="switch" name={name} checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} aria-describedby={`${id}-description`} className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:opacity-50" />
        <span aria-hidden className="pointer-events-none absolute left-1 size-4 rounded-full bg-foreground/70 transition-transform peer-checked:translate-x-5 peer-checked:bg-primary-foreground peer-disabled:opacity-50" />
      </span>
    </label>
  );
}
