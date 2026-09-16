"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRoundRolePreferenceAction } from "@/app/actions/role-preferences";
import type { Role } from "@/lib/balance/formation";
import { RolePreferencePicker } from "@/components/role-preference-picker";

type Props = {
  gameSlug: string;
  clanId: string;
  roundId: string;
  profileRanking: Role[];
  roundRanking: Role[] | null;
  locked: boolean;
  onPendingChange?: (pending: boolean) => void;
};
export function ClanBalanceOwnPreference(props: Props) {
  return (
    <OwnPreferenceEditor
      key={`${props.roundId}:${JSON.stringify(props.roundRanking)}:${JSON.stringify(props.profileRanking)}`}
      {...props}
    />
  );
}

function OwnPreferenceEditor({
  gameSlug,
  clanId,
  roundId,
  profileRanking,
  roundRanking,
  locked,
  onPendingChange,
}: Props) {
  const [value, setValue] = useState<Role[] | null>(roundRanking);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section
      className="rounded-xl border bg-muted/15 p-3"
      aria-label="내 역할 선호"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="text-xs font-semibold"
          id={`round-preference-${roundId}-label`}
        >
          이번 라운드 내 선호
        </h3>
        <Link
          href="/profile"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          프로필에서 설정
        </Link>
      </div>
      <RolePreferencePicker
        id={`round-preference-${roundId}`}
        labelledBy={`round-preference-${roundId}-label`}
        value={value}
        profileRanking={profileRanking}
        disabled={locked || pending}
        onChange={(selected) => {
          setValue(selected);
          setError(null);
          onPendingChange?.(true);
          start(async () => {
            try {
              const result = await saveRoundRolePreferenceAction(
                gameSlug,
                clanId,
                roundId,
                selected,
              );
              if (!result.ok) {
                setValue(roundRanking);
                setError(result.error);
              }
              router.refresh();
            } catch {
              setValue(roundRanking);
              setError(
                "선호를 저장하지 못했습니다. 연결을 확인하고 다시 선택하세요.",
              );
            } finally {
              onPendingChange?.(false);
            }
          });
        }}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {locked
          ? "편성이 시작되어 선호가 확정되었습니다."
          : pending
            ? "저장 중…"
            : "바꾸지 않으면 프로필 선호를 사용합니다. 변경은 이번 라운드에만 적용됩니다."}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
