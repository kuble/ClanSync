"use client";

import { useTranslator } from "#use-translator";
import { Input } from "@/components/ui/input";
import type { ResolvedHofConfig } from "@/lib/clan/stats/hof-config";
import { StatHelp } from "./stat-help";

export function HofEligibilitySettings({ cfg }: { cfg: ResolvedHofConfig }) {
  const tx = useTranslator();
  const fieldClass = "inline-block w-16 align-baseline text-center font-semibold tabular-nums";
  return <section className="space-y-3 rounded-xl border p-4">
    <h4 className="text-sm font-semibold">
      <StatHelp title={tx("순위 등재 기준")}>{tx("승률 순위에만 적용합니다. 새벽까지 이어진 내전 등으로 경기 수가 늘어도 최소 출전 수를 일정하게 유지할 수 있습니다.")}</StatHelp>
    </h4>
    <p className="break-keep text-sm leading-loose">
      {tx("클랜이 정규 경기를")} <span className="whitespace-nowrap"><Input aria-label={tx("기준 전환점")} name="eligibility_game_threshold" type="number" min={1} max={5000} required defaultValue={cfg.eligibilityGameThreshold} className={fieldClass} />{tx("경기까지")}</span> {tx("치렀을 때는, 멤버가 전체 경기의")} <span className="whitespace-nowrap"><Input aria-label={tx("최소 출전 비율")} name="eligibility_below_pct" type="number" min={1} max={100} required defaultValue={cfg.eligibilityBelowPct} className={fieldClass} />%</span> {tx("이상 출전해야 승률 순위에 오릅니다.")}
    </p>
    <p className="break-keep text-sm leading-loose">
      {tx("그다음 경기부터는 멤버가")} <span className="whitespace-nowrap"><Input aria-label={tx("최소 출전 경기 수")} name="eligibility_above_min_games" type="number" min={1} max={2000} required defaultValue={cfg.eligibilityAboveMinGames} className={fieldClass} />{tx("경기")}</span> {tx("이상 출전하면 됩니다.")}
    </p>
  </section>;
}
