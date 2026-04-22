import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ClanBalancePredictionPlaceholder({
  planPremium,
  gameSlug,
  clanId,
  isRosterParticipant,
  className,
}: {
  planPremium: boolean;
  gameSlug: string;
  clanId: string;
  isRosterParticipant: boolean;
  className?: string;
}) {
  const storeHref = `/games/${gameSlug}/clan/${clanId}/store`;

  if (isRosterParticipant) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">승부예측</CardTitle>
          <CardDescription>
            출전 라인업에 포함된 멤버는 승부예측에 참여하지 않습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!planPremium) {
    return (
      <Card
        className={cn(
          "border-amber-500/30 bg-amber-500/[0.06]",
          className,
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base">승부예측</CardTitle>
          <CardDescription>
            Premium 클랜에서 비출전 멤버가 블루/레드 승을 예측하고, 경기
            확정 후 개인 코인 보상을 받을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={storeHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            스토어에서 플랜 확인
          </Link>
        </CardContent>
      </Card>
    );
  }

  return null;
}
