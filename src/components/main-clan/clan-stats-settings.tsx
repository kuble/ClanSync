"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveClanHofConfigFormAction } from "@/app/actions/clan-stats-hof";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";
import { HofSettingsForm } from "./clan-stats-view";
import styles from "./hof-settings.module.css";

export function ClanStatsSettings({ model, gameSlug, clanId, scope }: {
  model: ClanStatsPageModel; gameSlug: string; clanId: string; scope: "hof" | "personal" | "records" | "intra";
}) {
  const [open, setOpen] = useState(false);
  if (scope === "records" || scope === "intra" ? !model.permissions.isLeader : !model.permissions.isStaff || !model.permissions.setHofRules) return null;
  const title = { hof: "명예의 전당 설정", personal: "개인 기록 설정", records: "경기 기록 설정", intra: "내전 통계 설정" }[scope];
  const description = { hof: "순위 공개와 등재 기준을 설정합니다.", personal: "공개 대상과 멤버에게 제공할 통계를 선택합니다.", records: "경기 기록의 열람·추가·편집·삭제 대상을 각각 선택합니다.", intra: "내전 통계를 볼 수 있는 대상을 선택합니다." }[scope];
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button type="button" size="icon" variant="ghost" aria-label={title} title={title} />}>
      <Settings2 className="size-4" aria-hidden="true" />
    </SheetTrigger>
    <SheetContent className={styles.sheet}><div className={styles.panel}>
      <SheetHeader className="shrink-0 px-5 pb-5 pt-5 pr-12"><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>
      {scope === "hof" || scope === "personal" ? <HofSettingsForm scope={scope} gameSlug={gameSlug} clanId={clanId} cfg={model.hof.config}
        totalGames={model.hof.periods.all.totals.matches} totalSessions={model.hof.periods.all.totals.sessions}
        exposeHof={model.hof.exposeHof} isLeader={model.permissions.isLeader} onDone={() => setOpen(false)} />
        : <StatsAccessSettings model={model} gameSlug={gameSlug} clanId={clanId} scope={scope} onDone={() => setOpen(false)} />}
    </div></SheetContent>
  </Sheet>;
}

function StatsAccessSettings({ model, gameSlug, clanId, scope, onDone }: {
  model: ClanStatsPageModel; gameSlug: string; clanId: string; scope: "records" | "intra"; onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const rows = scope === "records" ? [
    { key: "view_match_records", label: "경기 열람", roles: ["leader", "officer"] },
    { key: "create_match_records", label: "경기 추가", roles: ["leader"] },
    { key: "edit_match_records", label: "경기 편집", roles: ["leader"] },
    { key: "delete_match_records", label: "경기 삭제", roles: ["leader"] },
  ] : [{ key: "view_intra_stats", label: "통계 열람", roles: ["leader", "officer", "member"] }];
  return <form className="flex min-h-0 flex-1 flex-col" action={(fd) => start(async () => {
    try { await saveClanHofConfigFormAction(gameSlug, clanId, fd); toast.success("설정을 저장했습니다."); onDone(); }
    catch { toast.error("설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
  })}>
    <input type="hidden" name="settings_scope" value={scope} />
    <fieldset disabled={pending} className="min-h-0 flex-1 overflow-y-auto px-5">
      <table className="w-full rounded-xl border text-sm" aria-label="역할별 권한">
        <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="p-3 text-left">권한</th>{["클랜장", "운영진", "멤버"].map((label) => <th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(({ key, label, roles }) => {
          const selected = scope === "records" ? model.statsSettings?.recordRoles[key] ?? roles : model.statsSettings?.intraRoles ?? roles;
          return <tr key={key} className="border-b last:border-b-0"><th scope="row" className="p-3 text-left font-medium">{label}</th>{([{ id: "leader", label: "클랜장" }, { id: "officer", label: "운영진" }, { id: "member", label: "멤버" }] as const).map((role) => <td key={role.id} className="p-2 text-center"><input type="checkbox" name={key} value={role.id} aria-label={`${label} ${role.label}`} defaultChecked={role.id === "leader" || selected.includes(role.id)} disabled={role.id === "leader"} className="size-4 accent-primary" />{role.id === "leader" && <input type="hidden" name={key} value="leader" />}</td>)}</tr>;
        })}</tbody>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">클랜장은 항상 허용됩니다.{scope === "records" && " 추가·편집·삭제 권한을 가진 사람도 경기 열람이 허용되어야 작업할 수 있습니다."}</p>
    </fieldset>
    <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4"><Button variant="outline" type="button" disabled={pending} onClick={onDone}>취소</Button><Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button></div>
  </form>;
}
