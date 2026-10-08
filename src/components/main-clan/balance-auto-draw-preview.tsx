import { Check, ChevronDown, Crosshair, MousePointer2, Plus, Shield } from "lucide-react";
import type { Role } from "@/lib/balance/formation";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import { cn } from "@/lib/utils";
import styles from "./balance-formation-preview.module.css";

export const AUTO_DRAW_ORDER = [6, 2, 0, 8, 3, 1, 7, 4, 9, 5];
export const AUTO_DRAW_TEAMS = [0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
const myPlayer = 8;
const roleNames = { tank: "돌격", dmg: "공격", sup: "지원" };
const roleIcons = { tank: Shield, dmg: Crosshair, sup: Plus };
// Same role-row order as the actual shared lineup: damage, damage, tank, support, support.
const slots = [[3, 2], [5, 4], [0, 1], [6, 7], [9, 8]];
export type AutoDrawScene = {
  kind: "preference" | "roster" | "draw" | "complete";
  preferenceChanged?: boolean;
  revealed?: number;
};

export function BalanceAutoDrawPreview({ scene, players, elapsed }: {
  scene: AutoDrawScene;
  players: { name: string; role: Role }[];
  elapsed: number;
}) {
  const visible = new Set(AUTO_DRAW_ORDER.slice(0, scene.revealed ?? 0));
  const ranking: Role[] = scene.preferenceChanged ? ["sup", "dmg", "tank"] : ["tank", "dmg", "sup"];
  return (
    <div className={styles.screenStage} data-testid="auto-draw-screen" data-screen={scene.kind}>
      <div className={styles.screenHeader}>
        <strong>내전 편성</strong>
        <span>{scene.kind === "preference" ? "여우 · 내 화면" : "모두에게 보이는 화면"}</span>
      </div>
      <div key={scene.kind} className={styles.screenTransition}>
        {scene.kind === "preference" ? <div className={styles.preferenceScreen} role="group" aria-label="내 선호 역할 선택 화면">
          <span className="text-xs text-muted-foreground">이번 라운드 내 선호</span>
          <h3 className="text-lg font-semibold">어떤 역할로 플레이할까요?</h3>
          <p className="text-xs text-muted-foreground">원하는 역할을 앞순위로 바꿔요.</p>
          <div className={styles.preferencePicker}>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">내 선호 <ChevronDown size={13} /></span>
            <ol className={styles.preferenceRanks} aria-label="예시 역할 선호 순위">
              {ranking.map((role, index) => {
                const Icon = roleIcons[role];
                return <li key={role} data-preview-preference={role} className={cn(styles.preferenceRole, scene.preferenceChanged && index === 0 && styles.preferenceSelected)}>
                  <span className={styles.rank}>{index + 1}</span>
                  <Icon size={22} aria-hidden="true" />
                  <span>{roleNames[role]}</span>
                  {role === "sup" && !scene.preferenceChanged && <MousePointer2 size={18} className={styles.preferenceCursor} aria-hidden="true" />}
                </li>;
              })}
            </ol>
          </div>
          <p className={cn("flex items-center gap-1.5 text-xs", scene.preferenceChanged ? "text-primary" : "text-muted-foreground")}>
            {scene.preferenceChanged ? <><Check size={15} /> 지원을 1순위로 변경했어요</> : "예시는 지원을 가장 선호하는 여우의 화면입니다."}
          </p>
        </div> : scene.kind === "roster" ? <div className={styles.rosterScreen} role="group" aria-label="자동 배정 시작 전 화면">
          <div className="flex items-center justify-between text-xs"><strong>출전 선수</strong><span className="text-muted-foreground">10 / 10</span></div>
          <div className={styles.readyPlayers}>{players.map((player, index) => <div key={player.name} className={cn(styles.readyPlayer, index === myPlayer && styles.preferenceSelected)}>
            <strong>{player.name}{index === myPlayer && <small> · 나</small>}</strong><span>역할 배정 전</span>
          </div>)}</div>
          <div className={styles.drawStart}><span>자동 배정 · 역할별 추첨</span><strong>추첨 시작 <MousePointer2 size={16} aria-hidden="true" /></strong></div>
        </div> : <div className={styles.drawScreen} role="group" aria-label={scene.kind === "complete" ? "자동 배정 결과 화면" : "역할별 추첨 발표 화면"}>
          <div className={styles.drawStatus}><strong>{scene.kind === "complete" ? "팀 구성 완료" : visible.size ? "순서대로 역할과 자리를 공개합니다" : "추첨 순서를 섞고 있습니다"}</strong><span>{visible.size} / 10</span></div>
          <div className={styles.drawHeading}><strong>1팀</strong><span>VS</span><strong>2팀</strong></div>
          <div className={styles.drawSlots}>
            {slots.map((pair, row) => <div key={row} className={styles.drawRow}>
              {pair.map((index, team) => {
                const player = players[index];
                const revealed = visible.has(index);
                const rolling = players[(Math.floor(elapsed / 200) + row + team * 5) % players.length];
                const role = player.role === "dmg" ? "damage" : player.role === "sup" ? "support" : "tank";
                return <div key={team} className="contents">
                  {team === 1 && <OverwatchRoleIcon role={role} className={styles.slotRole} aria-label={roleNames[player.role]} />}
                  <div className={cn(styles.drawPlayer, team === 0 ? styles.drawTeamA : styles.drawTeamB, revealed && styles.drawRevealed, revealed && index === myPlayer && styles.myResult)}
                    data-preview-player={index} data-preview-team={revealed ? team === 0 ? "A" : "B" : "waiting"} data-revealed={revealed}>
                    <strong key={revealed ? player.name : "rolling"} className={revealed ? styles.revealedName : styles.rollingName}>{revealed ? player.name : rolling.name}{revealed && index === myPlayer && <small> · 나</small>}</strong>
                    <span>{revealed ? `${AUTO_DRAW_ORDER.indexOf(index) + 1}번 · ${roleNames[player.role]}` : "추첨 중"}</span>
                  </div>
                </div>;
              })}
            </div>)}
          </div>
        </div>}
      </div>
    </div>
  );
}
