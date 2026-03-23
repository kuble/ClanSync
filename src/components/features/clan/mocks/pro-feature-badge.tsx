"use client";

import { Badge } from "@/components/ui/badge";

/** PRO 전용 기능 표시용 목업 배지 */
export function ProFeatureBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={className}
      title="Premium 구독 시 이용 가능 (목업)"
    >
      PRO
    </Badge>
  );
}
