"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { namecardSymbol } from "@/lib/profile/symbols";

export function PlayerAvatar({ photoUrl, emblem, label, size = 32 }: { photoUrl?: string | null; emblem?: string | null; label: string; size?: number }) {
  const [failed, setFailed] = useState<string>();
  const photo = photoUrl && failed !== photoUrl ? photoUrl : null;
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10", size > 32 && "rounded-xl")} style={{ width: size, height: size }}>
    <Image src={photo ?? namecardSymbol(emblem).src} alt={`${label} 프로필 ${photo ? "사진" : "심볼"}`} width={size} height={size} unoptimized={!!photo} className={photo ? "size-full object-cover" : "size-full object-contain p-1 brightness-0 dark:brightness-100"} onError={photo ? () => setFailed(photo) : undefined}/>
  </span>;
}
