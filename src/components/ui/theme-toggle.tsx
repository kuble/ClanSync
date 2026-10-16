"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return <Button type="button" variant="ghost" size="icon" className={cn("shrink-0 text-foreground", className)}
    aria-label="라이트 테마" aria-pressed={mounted && resolvedTheme === "light"} title="라이트 / 다크 테마 전환"
    onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
    <Sun className="hidden dark:block" aria-hidden="true" /><Moon className="block dark:hidden" aria-hidden="true" />
  </Button>;
}
