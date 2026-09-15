import Link from "next/link";
import { Crown, Eye, LockKeyhole } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
  if (!isRosterParticipant && planPremium) return null;
  return (
    <section
      className={cn(
        "rounded-xl border bg-muted/15 p-4",
        !isRosterParticipant && "border-amber-500/25 bg-amber-500/[0.04]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Crown className="size-4 text-amber-500" aria-hidden="true" />
          승부예측
        </h4>
        {isRosterParticipant ? (
          <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <LockKeyhole className="size-4 text-amber-500" aria-hidden="true" />
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {isRosterParticipant
          ? "이번 경기에 출전 중입니다. 승부예측은 경기를 관전하는 멤버만 참여할 수 있습니다."
          : "Premium 클랜에서 승리할 팀을 예측하고 코인 보상을 받아보세요. 출전하지 않은 멤버가 참여할 수 있습니다."}
      </p>
      {!isRosterParticipant ? (
        <Link
          href={`/games/${gameSlug}/clan/${clanId}/store`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-4 w-full text-xs",
          )}
        >
          스토어에서 플랜 확인
        </Link>
      ) : null}
    </section>
  );
}
