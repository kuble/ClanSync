"use client";

import { Loader2, LockKeyhole } from "lucide-react";
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
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3"
      aria-label="내 역할 선호"
      aria-busy={pending}
    >
      <h3 className="sr-only" id={`round-preference-${roundId}-label`}>
        이번 라운드 내 선호
      </h3>
      <RolePreferencePicker
        id={`round-preference-${roundId}`}
        labelledBy={`round-preference-${roundId}-label`}
        value={value}
        profileRanking={profileRanking}
        compact
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
      <span role="status" className="text-muted-foreground">
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {locked ? <LockKeyhole className="size-4" aria-hidden="true" /> : null}
        <span className="sr-only">
          {locked
            ? "편성이 시작되어 선호가 확정되었습니다."
            : pending
              ? "저장 중…"
              : "변경은 이번 라운드에만 적용됩니다."}
        </span>
      </span>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
