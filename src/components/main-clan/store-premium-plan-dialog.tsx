"use client";

import { useRouter } from "next/navigation";
import type { ClanMemberRole } from "@/lib/clan/permission-defaults";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PLAN_ROWS: { area: string; free: string; premium: string }[] = [
  {
    area: "스토어",
    free: "기본 꾸미기·클랜 배너 슬롯 등",
    premium: "Premium 전용 카드·입장 효과 등 추가 항목",
  },
  {
    area: "알림·연동",
    free: "앱 내 기본 알림",
    premium: "Discord 웹훅 등 확장 알림(설정에 따라)",
  },
  {
    area: "운영 기능",
    free: "핵심 클랜 운영",
    premium: "고급 통계·대진표·승부예측",
  },
];

function roleLeadCopy(role: ClanMemberRole): string {
  if (role === "leader") {
    return "Premium 플랜으로 업그레이드하면 이 항목을 이용할 수 있습니다.";
  }
  if (role === "officer") {
    return "Premium 전용 항목입니다. 플랜 변경은 클랜장이 진행합니다.";
  }
  return "Premium 전용 항목입니다. 클랜장에게 문의해 주세요.";
}

export function StorePremiumPlanDialog({
  open,
  onOpenChange,
  actorRole,
  gameSlug,
  clanId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: ClanMemberRole;
  gameSlug: string;
  clanId: string;
}) {
  const router = useRouter();
  const manageHref = `/games/${gameSlug}/clan/${clanId}/manage#subscription`;
  const showManageCta = actorRole === "leader" || actorRole === "officer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Free / Premium 플랜 비교</DialogTitle>
          <DialogDescription>{roleLeadCopy(actorRole)}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground border-b">
              <tr>
                <th className="px-2 py-2 font-medium">영역</th>
                <th className="px-2 py-2 font-medium">Free</th>
                <th className="px-2 py-2 font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.area} className="border-b last:border-0">
                  <td className="px-2 py-2 font-medium">{row.area}</td>
                  <td className="text-muted-foreground px-2 py-2">
                    {row.free}
                  </td>
                  <td className="text-muted-foreground px-2 py-2">
                    {row.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground text-xs">
          유료 결제는 준비 중입니다. 현재 클랜 플랜과 제공 기능은 클랜 관리에서
          확인할 수 있습니다.
        </p>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button type="button" variant="ghost" />}>
            닫기
          </DialogClose>
          {showManageCta ? (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                router.push(manageHref);
              }}
            >
              구독·결제 탭으로 이동
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
