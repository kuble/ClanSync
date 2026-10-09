"use client";

import { useEffect, useRef, useState } from "react";
import type { ClanStatsDetail, ClanStatsPageModel } from "@/lib/clan/stats/load-clan-stats";

type PeriodDetail = Extract<ClanStatsDetail, { kind: "period" }>;

/** Keep the filter mounted while loading; never display the previous period as the new one. */
export function useStatsPeriod(model: ClanStatsPageModel, key: string, needed: boolean) {
  const owner = useRef({ model, cache: new Map<string, Promise<PeriodDetail>>() });
  const [result, setResult] = useState<{ model: ClanStatsPageModel; key: string; data?: PeriodDetail; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!model.deferredPeriods || !needed) return;
    if (owner.current.model !== model) owner.current = { model, cache: new Map() };
    const cache = owner.current.cache;
    let active = true;
    let request = cache.get(key);
    if (!request) {
      request = fetch(`/api/clans/${model.clanId}/stats?section=period&period=${key}`, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("선택한 기간의 통계를 불러오지 못했습니다.");
        return response.json() as Promise<PeriodDetail>;
      });
      cache.set(key, request);
    }
    request.then((data) => { if (active) setResult({ model, key, data }); }, (error: Error) => {
      cache.delete(key);
      if (active) setResult({ model, key, error: error.message });
    });
    return () => { active = false; };
  }, [model, key, needed, attempt]);
  const current = result?.model === model && result.key === key ? result : undefined;
  const pending = model.deferredPeriods && needed && !current?.data;
  return { data: current?.data, pending, feedback: pending ? <div role={current?.error ? "alert" : "status"} className="rounded-xl border p-6 text-sm text-muted-foreground">
    {current?.error ?? "선택한 기간의 통계를 불러오는 중…"}
    {current?.error && <button type="button" className="ml-3 underline" onClick={() => setAttempt((n) => n + 1)}>다시 불러오기</button>}
  </div> : null };
}
