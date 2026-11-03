"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeTabIcon() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const light = mounted && resolvedTheme === "light";

  return <link rel="icon" type="image/png" sizes="64x64" href={light ? "/brand/tab-light.png" : "/brand/tab-jade.png"} />;
}
