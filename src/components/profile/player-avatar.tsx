"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { namecardSymbol } from "@/lib/profile/symbols";

export function PlayerAvatar({ emblem, label, size = 32 }: { emblem?: string | null; label: string; size?: number }) {
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10", size > 32 && "rounded-xl")} style={{ width: size, height: size }}>
    <Image src={namecardSymbol(emblem).src} alt={`${label} 프로필 심볼`} width={size} height={size} className="size-full object-contain p-1 brightness-0 dark:brightness-100"/>
  </span>;
}
