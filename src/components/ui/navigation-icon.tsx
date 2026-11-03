"use client";

import { useTranslator } from "#use-translator";
import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ComponentType } from "react";

/** Keep the icon's space stable while its parent Link is awaiting navigation. */
export function NavigationIcon({
  icon: Icon,
  label,
  size = 18,
}: {
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  label: string;
  size?: number;
}) {
  const tx = useTranslator();
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderCircle
          size={size}
          className="motion-safe:animate-spin"
          data-navigation-pending="true"
          aria-hidden="true"
        />
      ) : (
        <Icon size={size} aria-hidden={true} />
      )}
      <span className="sr-only" role="status">
        {pending ? tx("{0} 페이지로 이동 중", label) : ""}
      </span>
    </>
  );
}
