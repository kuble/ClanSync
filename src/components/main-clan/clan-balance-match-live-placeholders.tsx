import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
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
            확정 후 클랜코인 배당을 받을 수 있습니다.
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

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">승부예측</CardTitle>
        <CardDescription>
          예측 제출·마감 타이머·코인 정산은 후속 릴리스에서 DB와 연결됩니다.
          아래 버튼은 UI 자리만 확보한 상태입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled>
          블루 승 예측
        </Button>
        <Button type="button" variant="secondary" disabled>
          레드 승 예측
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClanBalanceMatchResultPlaceholder({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">경기 결과 확정</CardTitle>
        <CardDescription>
          승리 팀 선택·무효(동점/재경기) 처리와 세션 종료 후 기록 반영은
          후속 작업에서 연결됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled>
          블루 승
        </Button>
        <Button type="button" variant="outline" disabled>
          레드 승
        </Button>
        <Button type="button" variant="ghost" disabled>
          무효 · 재경기
        </Button>
      </CardContent>
    </Card>
  );
}
