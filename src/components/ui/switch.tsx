import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: Omit<ComponentProps<"input">, "type" | "role">) {
  return <span className={cn("relative inline-flex h-6 w-11 shrink-0 align-middle", className)}>
    <input {...props} type="checkbox" role="switch" data-slot="switch" className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border border-input bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:opacity-50" />
    <span aria-hidden className="pointer-events-none absolute left-[3px] top-[3px] size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 peer-disabled:opacity-50 motion-reduce:transition-none" />
  </span>;
}
