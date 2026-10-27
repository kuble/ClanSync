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
        <StatHelp title="선호 역할">내전 역할 추첨의 기본 선호입니다. 경기마다 다시 입력하지 않아도 됩니다. 끌어서 순위를 바꾸거나 두 아이콘을 눌러 교환하세요. 좌우 방향키로도 순위를 바꿀 수 있습니다.</StatHelp>
      </h2>
      <p className={styles.accountHint}>내전에서 우선 배정받을 역할 순서를 정하세요.</p>
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
              "선호를 저장하지 못했습니다. 연결을 확인하고 다시 선택하세요.",
            );
          } finally {
            setPending(false);
          }
        }}
      />
      <p className={styles.roleSaveStatus} role="status">{pending ? "저장 중…" : "끌어서 순위 변경 · 두 아이콘을 눌러 교환"}</p>
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
