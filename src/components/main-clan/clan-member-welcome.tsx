"use client";

import { useTranslator } from "#use-translator";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, ChevronLeft, ExternalLink, HelpCircle, Megaphone, MessageCircle, Trophy } from "lucide-react";
import { entryTierGroups, type EntryTiers } from "@/lib/balance/entry-tiers";
import { OVERWATCH_POSITIONS } from "@/lib/clan/recruitment";
import { completeClanWelcomeAction } from "@/app/actions/clan-welcome";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHAT_SERVICES, readClanCommunityLinks } from "@/lib/clan/community-links";
import type { ClanDashboardModel } from "@/lib/clan/load-clan-dashboard";
import { parseClanRules } from "@/lib/clan/rules";
import { ChatServiceIcon } from "./chat-service-icon";

const guideSteps = [
  { label: "참여 링크", title: "함께할 채팅방", icon: MessageCircle },
  { label: "규칙", title: "함께 지킬 약속", icon: BookOpen },
  { label: "공지사항", title: "먼저 확인할 소식", icon: Megaphone },
];

export function ClanMemberWelcome({ clanId, clanName, basePath, model, joinedAt, entryTiers, initialOpen, showTrigger = true }: {
  clanId: string; clanName: string; basePath: string; model: Pick<ClanDashboardModel, "communityLinks" | "discordConnected" | "rules"> & {
    notices: { id: string; title: string; content: string }[]; errors: { rules: boolean; notices: boolean };
  };
  joinedAt: string; entryTiers?: EntryTiers; initialOpen: boolean; showTrigger?: boolean;
}) {
  const tx = useTranslator();
  const searchParams = useSearchParams();
  const router = useRouter();
  const steps = entryTiers ? [...guideSteps, { label: "티어", title: "역할별 경쟁전 티어", icon: Trophy }] : guideSteps;
  const [draft, setDraft] = useState<EntryTiers>({});
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
      const result = await completeClanWelcomeAction(clanId, joinedAt, entryTiers ? draft : undefined);
      if (result.ok) { setOpen(false); router.refresh(); } else setError(true);
    } catch { setError(true); } finally { setSaving(false); }
  }
  return <>
    {showTrigger && <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={tx("클랜 이용 안내")} onClick={() => { setStep(0); setError(false); setOpen(true); }} />}><HelpCircle aria-hidden /></TooltipTrigger><TooltipContent>{tx("클랜 이용 안내")}</TooltipContent></Tooltip>}
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!saving}>
        <DialogHeader><DialogTitle>{clanName}{tx("에 오신 것을 환영합니다")}</DialogTitle><DialogDescription>{tx("클랜 활동을 시작하기 전에 확인해 주세요.")}</DialogDescription></DialogHeader>
        <ol aria-label={tx("클랜 이용 안내 순서")} className="flex gap-2 border-b pb-4 text-xs">
          {steps.map(({ label }, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={`flex flex-1 items-center justify-center gap-1.5 ${index === step ? "font-semibold text-primary" : "text-muted-foreground"}`}><span className="flex size-5 items-center justify-center rounded-full border">{index < step ? <Check size={12} aria-hidden /> : index + 1}</span>{tx(label)}</li>)}
        </ol>
        <section aria-label={current.label} className="min-w-0 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold"><Icon size={17} className="text-primary" aria-hidden />{current.title}</h3>
          <div key={step} className="welcome-step min-h-40 max-h-[42svh] space-y-2 overflow-y-auto pr-1 board-scroll">
            {step === 0 && (services.length ? services.map(({ id, label }) => <a key={id} href={links[id]} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", className: "w-full justify-start gap-3" })}><ChatServiceIcon service={id} />{tx(label)}<ExternalLink size={13} className="ml-auto" aria-hidden /></a>) : <p className="text-sm text-muted-foreground">{tx("등록된 참여 링크가 없습니다.")}</p>)}
            {step === 1 && (rules.length ? <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">{rules.map((rule, i) => <li key={i} className="whitespace-pre-wrap break-words pl-1">{rule}</li>)}</ol> : <p className="text-sm text-muted-foreground">{model.errors.rules ? tx("규칙을 불러오지 못했습니다. 게시판에서 다시 확인하십시오.") : tx("등록된 규칙이 없습니다.")}</p>)}
            {step === 2 && (notices.length ? notices.map(notice => <article key={notice.id} className="rounded-lg border bg-card p-3"><h4 className="text-sm font-semibold break-words">{notice.title}</h4><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{notice.content}</p></article>) : <p className="text-sm text-muted-foreground">{model.errors.notices ? tx("공지사항을 불러오지 못했습니다. 게시판에서 다시 확인하십시오.") : tx("등록된 공지사항이 없습니다.")}</p>)}
            {step === 3 && entryTiers && <>
              <p className="text-sm text-muted-foreground">역할마다 가입 티어를 한 번 저장합니다. 분석점수는 플래티넘 3을 0점으로 한 칸당 0.2점씩 차이 나며, 이후 내전 결과에 따라 바뀝니다. 미배치 역할은 나중에 입력할 수 있습니다.</p>
              {OVERWATCH_POSITIONS.map(({ value: role, label }) => <label key={role} className="flex items-center justify-between gap-3 text-sm">
                {label}
                <select value={entryTiers[role] ?? draft[role] ?? ""} disabled={entryTiers[role] !== undefined || saving}
                  className="rounded-md border bg-background px-3 py-2"
                  onChange={e => {
                    const step = e.target.value;
                    setDraft(previous => {
                      const next = { ...previous };
                      if (step === "") delete next[role]; else next[role] = Number(step);
                      return next;
                    });
                  }}>
                  <option value="">미배치 / 모름</option>
                  {entryTierGroups.map(group => <optgroup key={group.name} label={group.name}>{group.divisions.map(tier => <option key={tier.step} value={tier.step}>{tier.label}</option>)}</optgroup>)}
                </select>
              </label>)}
            </>}
          </div>
        </section>
        {error && <p role="alert" className="text-xs text-destructive">{tx("완료 상태를 저장하지 못했습니다. 다시 시도하십시오.")}</p>}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" disabled={step === 0 || saving} onClick={() => setStep(value => value - 1)}><ChevronLeft aria-hidden />{tx("이전")}</Button>
          {step < steps.length - 1 ? <Button size="sm" onClick={() => setStep(value => value + 1)}>{tx("다음")}</Button> : <Button size="sm" disabled={saving} onClick={() => void finish()}>{saving ? tx("저장 중…") : tx("안내 완료")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
