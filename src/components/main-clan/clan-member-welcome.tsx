"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Check, ChevronLeft, ExternalLink, HelpCircle, Megaphone, MessageCircle } from "lucide-react";
import { completeClanWelcomeAction } from "@/app/actions/clan-welcome";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHAT_SERVICES, readClanCommunityLinks } from "@/lib/clan/community-links";
import type { ClanDashboardModel } from "@/lib/clan/load-clan-dashboard";
import { parseClanRules } from "@/lib/clan/rules";
import { ChatServiceIcon } from "./chat-service-icon";

const steps = [
  { label: "참여 링크", title: "함께할 채팅방", icon: MessageCircle },
  { label: "규칙", title: "함께 지킬 약속", icon: BookOpen },
  { label: "공지사항", title: "먼저 확인할 소식", icon: Megaphone },
];

export function ClanMemberWelcome({ clanId, clanName, basePath, model, joinedAt, initialOpen, showTrigger = true }: {
  clanId: string; clanName: string; basePath: string; model: Pick<ClanDashboardModel, "communityLinks" | "discordConnected" | "rules"> & {
    notices: { id: string; title: string; content: string }[]; errors: { rules: boolean; notices: boolean };
  };
  joinedAt: string; initialOpen: boolean; showTrigger?: boolean;
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(initialOpen && !searchParams.has("notice"));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const links = readClanCommunityLinks(model.communityLinks);
  if (model.discordConnected !== false) links.discord = `${basePath}/discord`;
  const services = CHAT_SERVICES.filter(({ id }) => links[id]);
  const rules = parseClanRules(model.rules);
  const notices = model.notices;
  const current = steps[step], Icon = current.icon;
  async function finish() {
    setSaving(true); setError(false);
    try {
      const result = await completeClanWelcomeAction(clanId, joinedAt);
      if (result.ok) setOpen(false); else setError(true);
    } catch { setError(true); } finally { setSaving(false); }
  }
  return <>
    {showTrigger && <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="클랜 이용 안내" onClick={() => { setStep(0); setError(false); setOpen(true); }} />}><HelpCircle aria-hidden /></TooltipTrigger><TooltipContent>클랜 이용 안내</TooltipContent></Tooltip>}
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!saving}>
        <DialogHeader><DialogTitle>{clanName}에 오신 것을 환영합니다</DialogTitle><DialogDescription>함께하기 전에 세 가지만 확인하십시오.</DialogDescription></DialogHeader>
        <ol aria-label="클랜 이용 안내 순서" className="flex gap-2 border-b pb-4 text-xs">
          {steps.map(({ label }, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={`flex flex-1 items-center justify-center gap-1.5 ${index === step ? "font-semibold text-primary" : "text-muted-foreground"}`}><span className="flex size-5 items-center justify-center rounded-full border">{index < step ? <Check size={12} aria-hidden /> : index + 1}</span>{label}</li>)}
        </ol>
        <section aria-label={current.label} className="min-w-0 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold"><Icon size={17} className="text-primary" aria-hidden />{current.title}</h3>
          <div key={step} className="welcome-step min-h-40 max-h-[42svh] space-y-2 overflow-y-auto pr-1 board-scroll">
            {step === 0 && (services.length ? services.map(({ id, label }) => <a key={id} href={links[id]} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", className: "w-full justify-start gap-3" })}><ChatServiceIcon service={id} />{label}<ExternalLink size={13} className="ml-auto" aria-hidden /></a>) : <p className="text-sm text-muted-foreground">등록된 참여 링크가 없습니다.</p>)}
            {step === 1 && (rules.length ? <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">{rules.map((rule, i) => <li key={i} className="whitespace-pre-wrap break-words pl-1">{rule}</li>)}</ol> : <p className="text-sm text-muted-foreground">{model.errors.rules ? "규칙을 불러오지 못했습니다. 게시판에서 다시 확인하십시오." : "등록된 규칙이 없습니다."}</p>)}
            {step === 2 && (notices.length ? notices.map(notice => <article key={notice.id} className="rounded-lg border bg-card p-3"><h4 className="text-sm font-semibold break-words">{notice.title}</h4><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{notice.content}</p></article>) : <p className="text-sm text-muted-foreground">{model.errors.notices ? "공지사항을 불러오지 못했습니다. 게시판에서 다시 확인하십시오." : "등록된 공지사항이 없습니다."}</p>)}
          </div>
        </section>
        {error && <p role="alert" className="text-xs text-destructive">완료 상태를 저장하지 못했습니다. 다시 시도하십시오.</p>}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" disabled={step === 0 || saving} onClick={() => setStep(value => value - 1)}><ChevronLeft aria-hidden />이전</Button>
          {step < 2 ? <Button size="sm" onClick={() => setStep(value => value + 1)}>다음</Button> : <Button size="sm" disabled={saving} onClick={() => void finish()}>{saving ? "저장 중…" : "안내 완료"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
