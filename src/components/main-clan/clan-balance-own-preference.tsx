"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRoundRolePreferenceAction } from "@/app/actions/role-preferences";
import { ROLE_LABEL, type Role } from "@/lib/balance/formation";
import { ROLE_RANKINGS } from "@/lib/balance/role-preferences";

type Props = {
  gameSlug: string;
  clanId: string;
  roundId: string;
  profileRanking: Role[];
  roundRanking: Role[] | null;
  locked: boolean;
  onPendingChange?: (pending: boolean) => void;
};
const label = (ranking: Role[]) =>
  ranking.length
    ? ranking.map((role) => ROLE_LABEL[role]).join(" → ")
    : "선호 없음";

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
  const initial = roundRanking === null ? "profile" : roundRanking.join(",");
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section
      className="rounded-xl border bg-muted/15 p-3"
      aria-label="내 역할 선호"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          className="text-xs font-semibold"
          htmlFor={`round-preference-${roundId}`}
        >
          이번 라운드 내 선호
        </label>
        <Link
          href="/profile"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          프로필 기본값
        </Link>
      </div>
      <select
        id={`round-preference-${roundId}`}
        className="mt-2 min-h-10 w-full rounded-lg border bg-background px-3 text-sm"
        value={value}
        disabled={locked || pending}
        onChange={(event) => {
          const selected = event.target.value;
          setValue(selected);
          setError(null);
          onPendingChange?.(true);
          start(async () => {
            try {
              const ranking =
                selected === "profile"
                  ? null
                  : (ROLE_RANKINGS.find(
                      (entry) => entry.join(",") === selected,
                    ) ?? []);
              const result = await saveRoundRolePreferenceAction(
                gameSlug,
                clanId,
                roundId,
                ranking,
              );
              if (!result.ok) {
                setValue(initial);
                setError(result.error);
              }
              router.refresh();
            } catch {
              setValue(initial);
              setError(
                "선호를 저장하지 못했습니다. 연결을 확인하고 다시 선택하세요.",
              );
            } finally {
              onPendingChange?.(false);
            }
          });
        }}
      >
        <option value="profile">프로필 기본값 · {label(profileRanking)}</option>
        {ROLE_RANKINGS.map((ranking) => (
          <option key={ranking.join(",")} value={ranking.join(",")}>
            {label(ranking)}
          </option>
        ))}
      </select>
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
