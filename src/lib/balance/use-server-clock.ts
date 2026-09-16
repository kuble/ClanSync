"use client";

import { useEffect, useState } from "react";

/** Anchor to the server snapshot, so a spectator's local clock cannot replay a draw. */
export function useServerClock(
  serverNow: number,
  until: number,
  cadence = 100,
) {
  const [sample, setSample] = useState({ anchor: serverNow, value: serverNow });
  useEffect(() => {
    if (serverNow >= until) return;
    const started = performance.now();
    const timer = setInterval(() => {
      const value = serverNow + performance.now() - started;
      setSample({ anchor: serverNow, value });
      if (value >= until) clearInterval(timer);
    }, cadence);
    return () => clearInterval(timer);
  }, [serverNow, until, cadence]);
  return sample.anchor === serverNow ? sample.value : serverNow;
}
