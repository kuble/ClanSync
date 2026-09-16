"use client";

import { useState } from "react";
import { Crosshair, Plus, Shield } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/balance/formation";
import { cn } from "@/lib/utils";

const UNRANKED_ROLES: Role[] = ["tank", "dmg", "sup"];
const ROLE_ICONS = { tank: Shield, dmg: Crosshair, sup: Plus };

export function RolePreferencePicker({
  id,
  labelledBy,
  value,
  profileRanking,
  disabled = false,
  onChange,
}: {
  id: string;
  labelledBy: string;
  value: Role[] | null;
  profileRanking?: Role[];
  disabled?: boolean;
  onChange: (ranking: Role[] | null) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [draggedRole, setDraggedRole] = useState<Role | null>(null);
  const ranking = value ?? profileRanking ?? [];
  const hasRanking = ranking.length === 3;
  // These are only available icons; an empty preference stays empty until edited.
  const roles = hasRanking ? ranking : UNRANKED_ROLES;

  function change(next: Role[] | null) {
    if (disabled) return;
    setSelectedRole(null);
    setDraggedRole(null);
    onChange(next);
  }

  function swap(source: Role, target: Role) {
    if (disabled || source === target) return;
    const next = [...roles];
    const from = next.indexOf(source);
    const to = next.indexOf(target);
    [next[from], next[to]] = [next[to], next[from]];
    change(next);
  }

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={`${id}-help`}
      className="mt-2"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ol aria-label="역할 선호 순위" className="flex gap-2">
          {roles.map((role, index) => {
            const Icon = ROLE_ICONS[role];
            const label = hasRanking
              ? `${index + 1}순위 ${ROLE_LABEL[role]}`
              : `${ROLE_LABEL[role]} · 순위 미설정`;
            return (
              <li key={role}>
                <button
                  type="button"
                  aria-label={label}
                  title={label}
                  aria-pressed={selectedRole === role}
                  aria-describedby={`${id}-help`}
                  disabled={disabled}
                  draggable={!disabled}
                  className={cn(
                    "relative flex size-12 touch-manipulation items-center justify-center rounded-xl border bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    hasRanking
                      ? "border-primary/25 text-foreground"
                      : "border-dashed text-muted-foreground",
                    !disabled &&
                      "cursor-grab hover:border-primary/60 active:cursor-grabbing",
                    selectedRole === role &&
                      "border-primary bg-primary/10 ring-2 ring-primary/30",
                    draggedRole === role && "opacity-40",
                  )}
                  onClick={() => {
                    if (selectedRole && selectedRole !== role)
                      swap(selectedRole, role);
                    else setSelectedRole(selectedRole === role ? null : role);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSelectedRole(null);
                      return;
                    }
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                      return;
                    event.preventDefault();
                    const target =
                      roles[index + (event.key === "ArrowLeft" ? -1 : 1)];
                    if (target) swap(role, target);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", role);
                    setSelectedRole(null);
                    setDraggedRole(role);
                  }}
                  onDragOver={(event) => {
                    if (!disabled && draggedRole && draggedRole !== role) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedRole) swap(draggedRole, role);
                    setDraggedRole(null);
                  }}
                  onDragEnd={() => setDraggedRole(null)}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground"
                  >
                    {hasRanking ? index + 1 : "–"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-1.5">
          {profileRanking !== undefined ? (
            <button
              type="button"
              aria-pressed={value === null}
              disabled={disabled}
              className={cn(
                "min-h-9 rounded-lg border px-2.5 text-xs transition-colors disabled:opacity-50",
                value === null
                  ? "border-primary/30 bg-primary/10 font-medium"
                  : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => {
                setSelectedRole(null);
                if (value !== null) change(null);
              }}
            >
              프로필 기본값
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={value !== null && value.length === 0}
            disabled={disabled}
            className={cn(
              "min-h-9 rounded-lg border px-2.5 text-xs transition-colors disabled:opacity-50",
              value !== null && value.length === 0
                ? "border-primary/30 bg-primary/10 font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
            onClick={() => {
              setSelectedRole(null);
              if (value === null || value.length) change([]);
            }}
          >
            선호 없음
          </button>
        </div>
      </div>
      <p id={`${id}-help`} className="mt-2 text-xs text-muted-foreground">
        {selectedRole
          ? "교환할 아이콘을 누르세요. 다시 누르면 취소됩니다."
          : "끌어서 순위 변경 · 두 아이콘을 눌러 교환"}
        <span className="sr-only">
          {" "}
          좌우 방향키로도 순위를 바꿀 수 있습니다.
        </span>
      </p>
    </div>
  );
}
