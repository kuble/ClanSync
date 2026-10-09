"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ClanStatsDetail } from "@/lib/clan/stats/load-clan-stats";
import { Button } from "@/components/ui/button";

export type StatsDetailCache = Map<string, Promise<ClanStatsDetail>>;

/** Cache belongs to one mounted, authorized page model, never to a shared module. */
export function StatsDetailLoader({ url, cache, initial, children }: { url?: string; cache: StatsDetailCache; initial?: ClanStatsDetail; children: (detail: ClanStatsDetail, pending: boolean) => ReactNode }) {
  const [result, setResult] = useState<{ cache: StatsDetailCache; url: string; detail?: ClanStatsDetail; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!url) return;
    let active = true;
    let request = cache.get(url);
    if (!request) {
      request = fetch(url, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("통계 기록을 불러오지 못했습니다.");
        return response.json() as Promise<ClanStatsDetail>;
      });
      cache.set(url, request);
    }
    request.then((detail) => { if (active) setResult({ cache, url, detail }); }, (error: Error) => {
      cache.delete(url);
      if (active) setResult({ cache, url, error: error.message });
    });
    return () => { active = false; };
  }, [url, cache, attempt]);
  const current = result?.cache === cache && result.url === url ? result : undefined;
  if (current?.detail || initial) return <div className="relative" aria-busy={!!url && !current?.detail}>
    {children(current?.detail ?? initial!, !!url && !current?.detail)}
    {url && !current?.detail && <div role={current?.error ? "alert" : "status"} className="absolute right-4 top-3 z-10 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground">
      {current?.error ?? "기록을 불러오는 중…"}{current?.error && <button type="button" className="ml-2 underline" onClick={() => setAttempt((n) => n + 1)}>다시 불러오기</button>}
    </div>}
  </div>;
  if (current?.error) return <div role="alert" className="rounded-xl border p-6 text-sm"><p>{current.error}</p><Button className="mt-3" variant="outline" size="sm" onClick={() => { setResult(undefined); setAttempt((n) => n + 1); }}>다시 불러오기</Button></div>;
  return <div role="status" className="min-h-64 space-y-4 rounded-xl border p-6"><p className="text-sm text-muted-foreground">통계 기록을 불러오는 중…</p><div className="h-8 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-32 animate-pulse rounded bg-muted motion-reduce:animate-none" /></div>;
}
