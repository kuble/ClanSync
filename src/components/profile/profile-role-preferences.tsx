"use client";

import { useState } from "react";
import { saveProfileRolePreferenceAction } from "@/app/actions/role-preferences";
import type { Role } from "@/lib/balance/formation";
import { parseRoleRanking } from "@/lib/balance/role-preferences";
import { RolePreferencePicker } from "@/components/role-preference-picker";

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
  const [value, setValue] = useState(ranking);
  const [confirmedValue, setConfirmedValue] = useState(ranking);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div>
      <h3
        id={`profile-role-${game.gameId}-label`}
        className="text-sm font-semibold"
      >
        {game.nameKo}
      </h3>
      <RolePreferencePicker
        id={`profile-role-${game.gameId}`}
        labelledBy={`profile-role-${game.gameId}-label`}
        value={value}
        disabled={pending}
        onChange={async (selected) => {
          if (selected === null) return;
          setValue(selected);
          setError(null);
          setPending(true);
          try {
            const result = await saveProfileRolePreferenceAction(
              game.gameId,
              selected,
            );
            if (!result.ok) {
              setValue(confirmedValue);
              setError(result.error);
            } else {
              const confirmed = result.ranking;
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
      />
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
