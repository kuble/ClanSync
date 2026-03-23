import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClanLayoutContext } from "@/lib/clan/types";
import { isOfficerRole } from "@/lib/clan/types";

interface OfficerGateProps {
  ctx: ClanLayoutContext;
  children: ReactNode;
}

/** 운영진(리더·오피서) 전용 영역. 구성원은 안내 카드만 표시. */
export function OfficerGate({ ctx, children }: OfficerGateProps) {
  const ok = isOfficerRole(ctx.membership.role);

  if (!ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>권한이 필요합니다</CardTitle>
          <CardDescription>
            이 기능은 클랜장·운영진만 사용할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          문의는 클랜 운영진에게 남겨 주세요.
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
