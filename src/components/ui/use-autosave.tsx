"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./button";

type SaveResult = { ok: true } | { ok: false; error: string };
type SaveStatus = "idle" | "saving" | "saved" | "error";

/** One request at a time; edits made during a save are sent next, without replacing the draft. */
export function useAutosave<T extends object>(initial: T, save: (value: T) => Promise<SaveResult>) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const latest = useRef(initial), saved = useRef(JSON.stringify(initial));
  const busy = useRef(false), mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useRef(save);
  useEffect(() => { persist.current = save; }, [save]);

  const flush = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (JSON.stringify(latest.current) !== saved.current) {
        const snapshot = latest.current, encoded = JSON.stringify(snapshot);
        if (mounted.current) { setStatus("saving"); setError(""); }
        const result = await persist.current(snapshot);
        if (!result.ok) {
          if (mounted.current) { setStatus("error"); setError(result.error); }
          return;
        }
        saved.current = encoded;
      }
      if (mounted.current) setStatus("saved");
    } catch {
      if (mounted.current) {
        setStatus("error");
        setError("변경 사항을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
      }
    } finally { busy.current = false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      // SPA navigation must not discard the last edit waiting for its debounce.
      if (JSON.stringify(latest.current) !== saved.current) void flush();
    };
  }, [flush]);

  function update(change: (current: T) => T) {
    latest.current = change(latest.current);
    setValue(latest.current);
    setStatus("saving"); setError("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void flush(); }, 350);
  }
  return { value, update, status, error, retry: flush };
}

export function AutosaveStatus({ status, error, retry }: { status: SaveStatus; error: string; retry: () => void }) {
  if (status === "idle") return null;
  return <div className="flex min-h-7 items-center justify-end gap-2 text-xs text-muted-foreground">
    {status === "error" ? <><span role="alert" className="text-destructive">{error}</span><Button size="sm" variant="ghost" onClick={retry}>다시 시도</Button></>
      : <span role="status" aria-live="polite">{status === "saving" ? "변경 사항 저장 중…" : "자동 저장됨"}</span>}
  </div>;
}
