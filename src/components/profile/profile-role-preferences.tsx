"use client";

import { useState } from "react";
import { saveProfileRolePreferenceAction } from "@/app/actions/role-preferences";
import { ROLE_LABEL, type Role } from "@/lib/balance/formation";
import {
  ROLE_RANKINGS,
  parseRoleRanking,
} from "@/lib/balance/role-preferences";

export function ProfileRolePreferences({
  games,
  preferences,
}: {
  games: { gameId: string; slug: string; nameKo: string }[];
  preferences: { game_id: string; ranking: string[] }[];
}) {
  const supported = games.filter((game) => game.slug === "overwatch");
  if (!supported.length) return null;
  return (
    <section
      className="mt-6 rounded-2xl border bg-card p-5"
      aria-labelledby="profile-role-preferences-heading"
    >
      <h2 id="profile-role-preferences-heading" className="text-base font-bold">
        게임별 선호 역할
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        내전 역할 추첨의 기본 선호입니다. 라운드마다 다시 입력하지 않아도
        됩니다.
      </p>
      <div className="mt-4 space-y-4">
        {supported.map((game) => {
          const ranking = parseRoleRanking(
            preferences.find((item) => item.game_id === game.gameId)?.ranking,
          );
          return (
            <GamePreference
              key={`${game.gameId}:${ranking.join(",")}`}
              game={game}
              ranking={ranking}
            />
          );
        })}
      </div>
    </section>
  );
}

function GamePreference({
  game,
  ranking,
}: {
  game: { gameId: string; nameKo: string };
  ranking: Role[];
}) {
  const [value, setValue] = useState(ranking.join(","));
  const [confirmedValue, setConfirmedValue] = useState(ranking.join(","));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div>
      <label
        htmlFor={`profile-role-${game.gameId}`}
        className="text-sm font-semibold"
      >
        {game.nameKo}
      </label>
      <select
        id={`profile-role-${game.gameId}`}
        value={value}
        disabled={pending}
        className="mt-2 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
        onChange={async (event) => {
          const selected = event.target.value;
          setValue(selected);
          setError(null);
          setPending(true);
          try {
            const selectedRanking =
              ROLE_RANKINGS.find((entry) => entry.join(",") === selected) ?? [];
            const result = await saveProfileRolePreferenceAction(
              game.gameId,
              selectedRanking,
            );
            if (!result.ok) {
              setValue(confirmedValue);
              setError(result.error);
            } else {
              const confirmed = result.ranking.join(",");
              setConfirmedValue(confirmed);
              setValue(confirmed);
            }
          } catch {
            setValue(confirmedValue);
            setError(
              "선호를 저장하지 못했습니다. 연결을 확인하고 다시 선택하세요.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {ROLE_RANKINGS.map((entry) => (
          <option key={entry.join(",")} value={entry.join(",")}>
            {entry.length
              ? entry.map((role) => ROLE_LABEL[role]).join(" → ")
              : "선호 없음"}
          </option>
        ))}
      </select>
      {pending ? (
        <p className="mt-1 text-xs text-muted-foreground" role="status">
          저장 중…
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
