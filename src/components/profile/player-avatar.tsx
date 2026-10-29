"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PlayerAvatar({ photoUrl, label, size = 32 }: { photoUrl?: string | null; emblem?: string | null; label: string; size?: number }) {
  const [failed, setFailed] = useState<string>();
  const photo = photoUrl && failed !== photoUrl ? photoUrl : null;
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10", size > 32 && "rounded-xl")} style={{ width: size, height: size }}>
    <Image src={photo ?? "/namecards/v1/shield.webp"} alt={`${label} 프로필 ${photo ? "사진" : "심볼"}`} width={size} height={size} unoptimized={!!photo} className={photo ? "size-full object-cover" : "size-full object-contain p-1"} onError={photo ? () => setFailed(photo) : undefined}/>
  </span>;
}
