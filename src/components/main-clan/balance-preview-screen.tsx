import { Check, ChevronDown, Crosshair, Crown, MousePointer2, Plus, Shield } from "lucide-react";
import type { FormationSettings, Role } from "@/lib/balance/formation";
import type { PreviewStep } from "./balance-formation-preview";
import { OverwatchRoleIcon } from "@/components/ui/overwatch-icons";
import { cn } from "@/lib/utils";
import styles from "./balance-formation-preview.module.css";

export const AUTO_DRAW_ORDER = [6, 2, 0, 8, 3, 1, 7, 4, 9, 5];
export const AUTO_DRAW_TEAMS = [0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
const myPlayer = 8;
const roleNames = { tank: "돌격", dmg: "공격", sup: "지원" };
const roleIcons = { tank: Shield, dmg: Crosshair, sup: Plus };
// Same role-row order as the actual shared lineup: damage, damage, tank, support, support.
const slotRoles: Role[] = ["dmg", "dmg", "tank", "sup", "sup"];
export type PreviewScene = {
  kind: "preference" | "roster" | "manual" | "draw" | "lineup" | "captains" | "draft" | "strategy" | "auction" | "settlement" | "items" | "complete";
  preferenceChanged?: boolean;
  revealed?: number;
  continuous?: boolean;
  turn?: number;
};

export function BalancePreviewScreen({ frame, settings, players, elapsed, remaining }: {
  frame: PreviewStep;
  settings: FormationSettings;
  players: { name: string; role: Role }[];
  elapsed: number;
  remaining: number;
}) {
  const scene = frame.scene;
  const roleDraw = scene.kind === "draw" && settings.roles === "lottery" && settings.teams !== "random";
  const visible = scene.revealed !== undefined
    ? new Set(AUTO_DRAW_ORDER.slice(0, scene.revealed))
    : new Set(frame.teams.flatMap((team, index) => team !== null ? [index] : []));
  const sourceTeams = players.map((_, index) => index % 2);
  const boardTeams = scene.kind === "manual" ? sourceTeams : roleDraw || scene.kind === "draw" ? (settings.roles === "lottery" ? AUTO_DRAW_TEAMS : sourceTeams) : frame.teams;
  const slots = slotRoles.map((role, row) => [0, 1].map((team) => players.flatMap((player, index) => player.role === role && boardTeams[index] === team ? [index] : [])[row === 1 || row === 4 ? 1 : 0]));
  const assigned = frame.teams.filter((team) => team !== null).length;
  const screenNames: Record<PreviewScene["kind"], string> = {
    preference: "내 선호 역할 선택 화면", roster: "편성 시작 전 화면", manual: "수동 역할 배치 화면", draw: "역할별 추첨 발표 화면",
    lineup: "팀 배치 화면", captains: "주장 선정 화면", draft: "주장 지명 화면", strategy: "전략 준비 화면",
    auction: "A팀 주장 경매 화면", settlement: "낙찰 결과 화면", items: "전략 아이템 선택 화면", complete: "편성 결과 화면",
  };
  const creditCards = <div className={styles.creditCards}>{[0, 1].map((team) => <div key={team}>
    <span>{team === 0 ? "A팀 · 내 팀" : "B팀 · 상대 팀"}</span><strong data-testid={`preview-credits-${team}`}>{frame.credits[team]} cr</strong>
  </div>)}</div>;
  const ranking: Role[] = scene.preferenceChanged ? ["sup", "dmg", "tank"] : ["tank", "dmg", "sup"];
  return (
    <div className={styles.screenStage} data-testid="formation-preview-screen" data-screen={scene.kind}>
      <div className={styles.screenHeader}>
        <strong>내전 편성</strong>
        {scene.kind === "complete" && settings.teams === "auction" ? <span className="flex gap-2">{[0, 1].map((team) => <span key={team} data-testid={`preview-credits-${team}`}>{frame.credits[team]} cr</span>)}</span> : <span>{scene.kind === "preference" ? "여우 · 내 화면" : scene.kind === "manual" || scene.kind === "captains" ? "운영진 시점" : scene.kind === "auction" || scene.kind === "draft" ? "A팀 주장 시점" : "모두에게 보이는 화면"}</span>}
      </div>
      <div key={scene.kind} className={styles.screenTransition} role="group" aria-label={screenNames[scene.kind]}>
        {scene.kind === "preference" ? <div className={styles.preferenceScreen}>
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
        </div> : scene.kind === "roster" ? <div className={styles.rosterScreen}>
          <div className="flex items-center justify-between text-xs"><strong>출전 선수</strong><span className="text-muted-foreground">10 / 10</span></div>
          <div className={styles.readyPlayers}>{players.map((player, index) => <div key={player.name} className={cn(styles.readyPlayer, index === myPlayer && styles.preferenceSelected)}>
            <strong>{player.name}{index === myPlayer && <small> · 나</small>}</strong><span>역할 배정 전</span>
          </div>)}</div>
          <div className={styles.drawStart}><span>자동 배정 · 편성 시작</span><strong>추첨 시작 <MousePointer2 size={16} aria-hidden="true" /></strong></div>
        </div> : scene.kind === "captains" ? <div className={styles.centerScreen}>
          <h3>양 팀 주장 선정</h3><p>같은 역할의 두 선수가 주장을 맡아요.</p>
          <div className={styles.captainCards}>{[0, 1].map((team) => <div key={team} className={team === 0 ? styles.drawTeamA : styles.drawTeamB}>
            <Crown size={28} aria-hidden="true" /><strong>{team === 0 ? "A" : "B"}팀 · {players[team].name}</strong><span>돌격 · 주장</span>
          </div>)}</div>
          <p>{settings.roles === "lottery" ? "자동 배정으로 정해진 돌격 2명이 주장이 됩니다." : "운영진이 같은 역할의 두 주장을 지정합니다."}</p>
        </div> : scene.kind === "draft" ? <div className={styles.draftScreen}>
          <div className={styles.draftTurn}><span>A → B → B → A</span><strong>{scene.turn === 0 ? "A팀 · 내 지명 차례" : "B팀 · 상대 지명 차례"}</strong></div>
          <div className={styles.draftCandidates}>{players.slice(2).map((player, offset) => {
            const index = offset + 2;
            const team = frame.teams[index];
            return <div key={index} className={cn(styles.draftCandidate, frame.active.includes(index) && styles.preferenceSelected, team !== null && !frame.active.includes(index) && styles.pickedCandidate)}>
              <strong>{player.name}</strong><span>{roleNames[player.role]}{team !== null ? ` · ${team === 0 ? "A" : "B"}팀 합류` : " · 지명 가능"}</span>
              {frame.active.includes(index) && scene.turn === 0 && <MousePointer2 size={16} aria-hidden="true" />}
            </div>;
          })}</div>
          <p className="text-xs text-muted-foreground">{assigned - 2} / 8명 선발 · 역할 정원 안에서 선택해요.</p>
        </div> : scene.kind === "strategy" || scene.kind === "items" ? <div className={styles.centerScreen}>
          <h3>{scene.kind === "items" ? "남은 크레딧으로 아이템 선택" : "전략 아이템 공개 · 준비"}</h3>
          {creditCards}
          <div className={styles.itemCards}>{["A", "B", "C"].map((item) => <div key={item}><Shield size={22} aria-hidden="true" /><strong>전략 카드 {item}</strong><span>클랜 등록 아이템 예시</span></div>)}</div>
          <p>{scene.kind === "items" ? "팀당 최대 1개 · 양 팀 동일 아이템 구매 가능" : `${settings.strategySeconds}초 전략 준비 후 선수 경매 시작`}</p>
          {scene.kind === "items" && <div className={styles.myBid}>구매 안 함 <Check size={15} aria-hidden="true" /></div>}
        </div> : scene.kind === "auction" || scene.kind === "settlement" ? <div className={styles.auctionScreen}>
          {creditCards}
          {frame.auction ? <>
            <div className={styles.auctionPlayer}><strong>{players[frame.auction.player].name}</strong><span>{roleNames[players[frame.auction.player].role]} · {scene.kind === "settlement" ? "낙찰 확정" : "경매 중인 선수"}</span></div>
            <div className="flex items-center justify-between gap-2 text-xs"><span>{remaining === 0 ? "입찰 종료" : frame.auction.extended ? "연장된 시간" : "입찰 남은 시간"}</span><strong className="text-xl tabular-nums" data-testid="auction-preview-timer">{remaining}초</strong></div>
            <div className="h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, remaining / (frame.auction.extended ? 5 : settings.durationSeconds) * 100)}%` }} /></div>
            <div className="flex items-center justify-between gap-2 text-xs"><span>{frame.auction.leader === null ? "아직 입찰이 없어요" : frame.auction.leader === 0 ? "내 팀이 최고 입찰 중" : "상대 팀이 최고 입찰 중"}</span><strong data-testid="auction-preview-price">{frame.auction.amount} cr</strong></div>
            <p className="text-xs text-muted-foreground" data-testid="auction-preview-notice">{frame.auction.notice}</p>
            <div className={cn(styles.myBid, frame.auction.myAction && styles.bidClick)} key={frame.title}>
              {remaining === 0 ? `${frame.auction.leader === 0 ? "A" : "B"}팀 낙찰` : frame.auction.myAction ? `A팀 ${frame.auction.amount} cr 입찰 완료` : `내 입찰 ${frame.auction.nextBid} cr`}
              {frame.auction.myAction && <MousePointer2 size={18} className={styles.cursor} aria-hidden="true" />}
            </div>
          </> : <div className={styles.centerScreen}>
            <Crown size={32} aria-hidden="true" /><h3>{scene.kind === "settlement" ? "선수 합류 · 크레딧 차감" : "A팀 주장 시점으로 보여드릴게요"}</h3>
            {scene.kind === "settlement" ? <p>{frame.active.map((index) => players[index].name).join(" · ")}이 합류했어요. 다음 선수가 공개됩니다.</p> : <p>선수 공개 → 내 입찰 → 상대 입찰 → 재입찰 → 낙찰</p>}
          </div>}
        </div> : <div className={styles.drawScreen}>
          <div className={styles.drawStatus}><strong>{scene.kind === "complete" ? "팀 구성 완료" : scene.kind === "manual" ? "명단에서 역할과 자리 배치" : scene.kind === "lineup" ? "선발된 팀원 합류" : visible.size ? "순서대로 역할과 자리를 공개합니다" : "추첨 순서를 섞고 있습니다"}</strong><span>{scene.kind === "manual" ? "10" : visible.size} / 10</span></div>
          <div className={styles.drawHeading}><strong>{roleDraw ? "역할 자리" : "1팀"}</strong><span>{roleDraw ? "역할" : "VS"}</span><strong>{roleDraw ? "역할 자리" : "2팀"}</strong></div>
          <div className={styles.drawSlots}>
            {slots.map((pair, row) => <div key={row} className={styles.drawRow}>
              {pair.map((index, team) => {
                const player = players[index ?? 0];
                const revealed = index !== undefined && (scene.kind === "manual" || visible.has(index));
                const rolling = players[(Math.floor(elapsed / 200) + row + team * 5) % players.length];
                const role = slotRoles[row] === "dmg" ? "damage" : slotRoles[row] === "sup" ? "support" : "tank";
                return <div key={team} className="contents">
                  {team === 1 && <OverwatchRoleIcon role={role} className={styles.slotRole} aria-label={roleNames[slotRoles[row]]} />}
                  <div className={cn(styles.drawPlayer, team === 0 ? styles.drawTeamA : styles.drawTeamB, revealed && styles.drawRevealed, revealed && index === myPlayer && styles.myResult)}
                    data-preview-player={index} data-preview-team={revealed && !roleDraw ? team === 0 ? "A" : "B" : "waiting"} data-revealed={revealed}>
                    <strong key={revealed ? player.name : "rolling"} className={revealed ? styles.revealedName : styles.rollingName}>{revealed ? player.name : scene.kind === "draw" ? rolling.name : "빈 자리"}{revealed && index === myPlayer && <small> · 나</small>}</strong>
                    <span>{revealed ? roleNames[player.role] : scene.kind === "draw" ? "추첨 중" : roleNames[slotRoles[row]]}</span>
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
