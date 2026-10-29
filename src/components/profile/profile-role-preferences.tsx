"use client";

import { StatHelp } from "@/components/main-clan/stat-help";
import { useState } from "react";
import { saveProfileRolePreferenceAction } from "@/app/actions/role-preferences";
import type { Role } from "@/lib/balance/formation";
import { parseRoleRanking } from "@/lib/balance/role-preferences";
import { RolePreferencePicker } from "@/components/role-preference-picker";
import styles from "./profile.module.css";

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
      className={styles.accountRoles}
      aria-labelledby="profile-role-preferences-heading"
    >
      <h2 aria-label="게임별 선호 역할" id="profile-role-preferences-heading" className={styles.accountSubheading}>
        <StatHelp title="선호 역할">내전 역할 추첨의 기본 선호입니다. 왼쪽 역할부터 우선하며, &gt;는 우선순위를 나타냅니다. 선호 없음이면 우선순위를 적용하지 않습니다. 끌어서 순위를 바꾸거나 두 아이콘을 눌러 교환하십시오. 좌우 방향키로도 순위를 바꿀 수 있습니다.</StatHelp>
      </h2>
      <div className={styles.accountRolePicker}>
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
        className="sr-only"
      >
        {game.nameKo}
      </h3>
      <RolePreferencePicker
        showPriority
        hideHelp
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
              "선호를 저장하지 못했습니다. 연결을 확인하고 다시 선택하십시오.",
            );
          } finally {
            setPending(false);
          }
        }}
      />
      <p className="sr-only" role="status">{pending ? "저장 중…" : ""}</p>
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
