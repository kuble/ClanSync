"use client";

import { useState } from "react";
import Image from "next/image";
import { Map } from "lucide-react";
import { mapDetailsForLabel } from "@/lib/balance/map-pools";
import { cn } from "@/lib/utils";

/** Decorative artwork: the enclosing map card supplies its accessible name. */
export function BalanceMapImage({ label, className, sizes = "(max-width: 640px) 100vw, 50vw" }: {
  label: string;
  className?: string;
  sizes?: string;
}) {
  const source = mapDetailsForLabel(label)?.image;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!source || failedSource === source) {
    return <span aria-hidden="true" className={cn("absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-700 via-slate-800 to-slate-950", className)}><Map className="size-12 text-white/20" /></span>;
  }
  return <Image src={source} alt="" fill sizes={sizes} className={cn("object-cover", className)} onError={() => setFailedSource(source)} />;
}
