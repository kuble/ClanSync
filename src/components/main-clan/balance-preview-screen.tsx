import { useTranslator } from "#use-translator";
import { Check, ChevronDown, Crosshair, Crown, MousePointer2, Plus, Shield } from "lucide-react";
import type { FormationSettings, Role } from "@/lib/balance/formation";
import type { ReactNode } from "react";
import type { PreviewStep, PreviewSettingField, PreviewSettingFocus } from "./balance-formation-preview";
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
  kind: "preference" | "roster" | "manual" | "draw" | "lineup" | "captains" | "draft" | "strategy" | "auction" | "settlement" | "preparation" | "items" | "complete";
  preferenceChanged?: boolean;
  revealed?: number;
  continuous?: boolean;
  turn?: number;
};

const settingLabels: Record<PreviewSettingField, string> = {
  auctionBudget: "팀 크레딧", minBid: "최소·증액 단위", durationSeconds: "입찰 시간",
  auctionPreparationSeconds: "낙찰 후 준비 시간", bidExtensionSeconds: "입찰 연장 시간", strategySeconds: "전략 준비 시간",
};
function SettingHighlight({ field, focus, children }: { field: PreviewSettingField; focus: PreviewSettingFocus | null; children: ReactNode }) {
  const tx = useTranslator();
  if (focus?.field !== field) return children;
  const unit = field === "auctionBudget" || field === "minBid" ? " cr" : "초";
  return <div className={styles.settingHighlight} data-preview-highlight={field}>
    {children}
    <span className="sr-only" role="status">
      {tx(settingLabels[field])} · {focus.previousValue !== focus.value ? <>{focus.previousValue}{tx(unit)} → </> : null}
      <strong>{focus.value}{tx(unit)}{focus.value === 0 && field === "bidExtensionSeconds" ? tx(" (연장 끔)") : ""}</strong>
    </span>
  </div>;
}

export function BalancePreviewScreen({ frame, settings, players, elapsed, remaining, focus = null }: {
  frame: PreviewStep;
  settings: FormationSettings;
  players: { name: string; role: Role }[];
  elapsed: number;
  remaining: number;
  focus?: PreviewSettingFocus | null;
}) {
  const tx = useTranslator();
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
    auction: "A팀 주장 경매 화면", settlement: "낙찰 결과 화면", preparation: "다음 선수 준비 화면", items: "전략 아이템 선택 화면", complete: "편성 결과 화면",
  };
  const creditCards = <div className={styles.creditCards}>{[0, 1].map((team) => <div key={team}>
    <span>{team === 0 ? tx("A팀 · 내 팀") : tx("B팀 · 상대 팀")}</span>
    <SettingHighlight field="auctionBudget" focus={team === 0 ? focus : null}><span>{tx("팀 크레딧 ·")} <strong data-testid={`preview-credits-${team}`}>{frame.credits[team]} cr</strong></span></SettingHighlight>
  </div>)}</div>;
  const ranking: Role[] = scene.preferenceChanged ? ["sup", "dmg", "tank"] : ["tank", "dmg", "sup"];
  return (
    <div className={styles.screenStage} data-testid="formation-preview-screen" data-screen={scene.kind}>
      <div className={styles.screenHeader}>
        <strong>{tx("내전 편성")}</strong>
        {scene.kind === "complete" && settings.teams === "auction" ? <span className="flex gap-2">{[0, 1].map((team) => <span key={team} data-testid={`preview-credits-${team}`}>{frame.credits[team]} cr</span>)}</span> : <span>{scene.kind === "preference" ? tx("여우 · 내 화면") : scene.kind === "manual" || scene.kind === "captains" ? tx("운영진 시점") : scene.kind === "auction" || scene.kind === "draft" ? tx("A팀 주장 시점") : tx("모두에게 보이는 화면")}</span>}
      </div>
      <div key={scene.kind} className={styles.screenTransition} role="group" aria-label={screenNames[scene.kind]}>
        {scene.kind === "preference" ? <div className={styles.preferenceScreen}>
          <span className="text-xs text-muted-foreground">{tx("이번 경기 내 선호")}</span>
          <h3 className="text-lg font-semibold">{tx("어떤 역할로 플레이하시겠습니까?")}</h3>
          <p className="text-xs text-muted-foreground">{tx("원하는 역할을 앞순위로 바꿉니다.")}</p>
          <div className={styles.preferencePicker}>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">{tx("내 선호")} <ChevronDown size={13} /></span>
            <ol className={styles.preferenceRanks} aria-label={tx("예시 역할 선호 순위")}>
              {ranking.map((role, index) => {
                const Icon = roleIcons[role];
                return <li key={role} data-preview-preference={role} className={cn(styles.preferenceRole, scene.preferenceChanged && index === 0 && styles.preferenceSelected)}>
                  <span className={styles.rank}>{index + 1}</span>
                  <Icon size={22} aria-hidden="true" />
                  <span>{tx(roleNames[role])}</span>
                  {role === "sup" && !scene.preferenceChanged && <MousePointer2 size={18} className={styles.preferenceCursor} aria-hidden="true" />}
                </li>;
              })}
            </ol>
          </div>
          <p className={cn("flex items-center gap-1.5 text-xs", scene.preferenceChanged ? "text-primary" : "text-muted-foreground")}>
            {scene.preferenceChanged ? <><Check size={15} /> {tx("지원을 1순위로 변경했습니다")}</> : tx("예시는 지원을 가장 선호하는 여우의 화면입니다.")}
          </p>
        </div> : scene.kind === "roster" ? <div className={styles.rosterScreen}>
          <div className="flex items-center justify-between text-xs"><strong>{tx("출전 선수")}</strong><span className="text-muted-foreground">10 / 10</span></div>
          <div className={styles.readyPlayers}>{players.map((player, index) => <div key={player.name} className={cn(styles.readyPlayer, index === myPlayer && styles.preferenceSelected)}>
            <strong>{player.name}{index === myPlayer && <small> {tx("· 나")}</small>}</strong><span>{tx("역할 배정 전")}</span>
          </div>)}</div>
          <div className={styles.drawStart}><span>{tx("자동 배정 · 편성 시작")}</span><strong>{tx("추첨 시작")} <MousePointer2 size={16} aria-hidden="true" /></strong></div>
        </div> : scene.kind === "captains" ? <div className={styles.centerScreen}>
          <h3>{tx("양 팀 주장 선정")}</h3><p>{tx("같은 역할의 두 선수가 주장을 맡습니다.")}</p>
          <div className={styles.captainCards}>{[0, 1].map((team) => <div key={team} className={team === 0 ? styles.drawTeamA : styles.drawTeamB}>
            <Crown size={28} aria-hidden="true" /><strong>{team === 0 ? "A" : "B"}{tx("팀 ·")} {players[team].name}</strong><span>{tx("돌격 · 주장")}</span>
          </div>)}</div>
          <p>{settings.roles === "lottery" ? tx("자동 배정으로 정해진 돌격 2명이 주장이 됩니다.") : tx("운영진이 같은 역할의 두 주장을 지정합니다.")}</p>
        </div> : scene.kind === "draft" ? <div className={styles.draftScreen}>
          <div className={styles.draftTurn}><span>A → B → B → A</span><strong>{scene.turn === 0 ? tx("A팀 · 내 지명 차례") : tx("B팀 · 상대 지명 차례")}</strong></div>
          <div className={styles.draftCandidates}>{players.slice(2).map((player, offset) => {
            const index = offset + 2;
            const team = frame.teams[index];
            return <div key={index} className={cn(styles.draftCandidate, frame.active.includes(index) && styles.preferenceSelected, team !== null && !frame.active.includes(index) && styles.pickedCandidate)}>
              <strong>{player.name}</strong><span>{tx(roleNames[player.role])}{team !== null ? tx(" · {0}팀 합류", team === 0 ? "A" : "B") : tx(" · 지명 가능")}</span>
              {frame.active.includes(index) && scene.turn === 0 && <MousePointer2 size={16} aria-hidden="true" />}
            </div>;
          })}</div>
          <p className="text-xs text-muted-foreground">{assigned - 2} {tx("/ 8명 선발 · 역할 정원 안에서 선택합니다.")}</p>
        </div> : scene.kind === "strategy" || scene.kind === "items" ? <div className={styles.centerScreen}>
          <h3>{scene.kind === "items" ? tx("남은 크레딧으로 아이템 선택") : tx("전략 아이템 공개 · 준비")}</h3>
          {creditCards}
          <div className={styles.itemCards}>{[{ name: "영웅 밴 1장", cost: 100 }, { name: "맵 선택권 1장", cost: 50 }, { name: "영웅 밴 2장", cost: 200 }].map((item) => <div key={item.name}><Shield size={22} aria-hidden="true" /><strong>{item.name}</strong><span>{item.cost}cr</span></div>)}</div>
          <SettingHighlight field="strategySeconds" focus={focus}><p>{scene.kind === "items" ? tx("팀당 최대 1개 · 양 팀 동일 아이템 구매 가능") : tx("{0}초 전략 준비 후 선수 경매 시작", settings.strategySeconds)}</p></SettingHighlight>
          {scene.kind === "items" && <div className={styles.myBid}>{tx("구매 안 함")} <Check size={15} aria-hidden="true" /></div>}
        </div> : scene.kind === "auction" || scene.kind === "settlement" || scene.kind === "preparation" ? <div className={styles.auctionScreen}>
          {creditCards}
          {frame.auction ? <>
            <div className={styles.auctionPlayer}><strong>{players[frame.auction.player].name}</strong><span>{tx(roleNames[players[frame.auction.player].role])} · {scene.kind === "settlement" ? tx("낙찰 확정") : tx("경매 중인 선수")}</span></div>
            <SettingHighlight field="durationSeconds" focus={focus}><div className="flex items-center justify-between gap-2 text-xs"><span>{remaining === 0 ? tx("입찰 종료") : frame.auction.extended ? tx("연장된 시간") : tx("입찰 남은 시간")}</span><strong className="text-xl tabular-nums" data-testid="auction-preview-timer">{remaining}{tx("초")}</strong></div></SettingHighlight>
            <div className="h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, remaining / (frame.auction.extended ? settings.bidExtensionSeconds : settings.durationSeconds) * 100)}%` }} /></div>
            <div className="flex items-center justify-between gap-2 text-xs"><span>{frame.auction.leader === null ? tx("아직 입찰이 없습니다") : frame.auction.leader === 0 ? tx("내 팀이 최고 입찰 중") : tx("상대 팀이 최고 입찰 중")}</span><strong data-testid="auction-preview-price">{frame.auction.amount} cr</strong></div>
            <SettingHighlight field="bidExtensionSeconds" focus={focus}><p className="text-xs text-muted-foreground" data-testid="auction-preview-notice">{frame.auction.notice}</p></SettingHighlight>
            <SettingHighlight field="minBid" focus={focus}><div className={cn(styles.myBid, frame.auction.myAction && styles.bidClick)} key={frame.title}>
              {remaining === 0 ? tx("{0}팀 낙찰", frame.auction.leader === 0 ? "A" : "B") : frame.auction.leader === 0 ? tx("최고 입찰 중 · 상대 팀 입찰 대기") : tx("내 입찰 {0} cr", frame.auction.nextBid)}
              {frame.auction.myAction && <MousePointer2 size={18} className={styles.cursor} aria-hidden="true" />}
            </div></SettingHighlight>
          </> : <div className={styles.centerScreen}>
            <Crown size={32} aria-hidden="true" /><h3>{scene.kind === "settlement" ? tx("선수 합류 · 크레딧 차감") : tx("A팀 주장 시점으로 보여드립니다")}</h3>
            {frame.preparationSeconds !== undefined ? <><p>{tx("다음 경매 선수 ·")} {players[3].name} ({tx(roleNames[players[3].role])})</p><p>{tx("입찰할 금액을 준비하십시오.")}</p><SettingHighlight field="auctionPreparationSeconds" focus={focus}><strong data-testid="auction-preview-preparation">{remaining}{tx("초")}</strong></SettingHighlight></> : <p>{tx("선수 공개 → 내 입찰 → 상대 입찰 → 재입찰 → 낙찰")}</p>}
          </div>}
        </div> : <div className={styles.drawScreen}>
          <div className={styles.drawStatus}><strong>{scene.kind === "complete" ? tx("팀 구성 완료") : scene.kind === "manual" ? tx("명단에서 역할과 자리 배치") : scene.kind === "lineup" ? tx("선발된 팀원 합류") : visible.size ? tx("순서대로 역할과 자리를 공개합니다") : tx("추첨 순서를 섞고 있습니다")}</strong><span>{scene.kind === "manual" ? "10" : visible.size} / 10</span></div>
          <div className={styles.drawHeading}><strong>{roleDraw ? tx("역할 자리") : tx("1팀")}</strong><span>{roleDraw ? tx("역할") : "VS"}</span><strong>{roleDraw ? tx("역할 자리") : tx("2팀")}</strong></div>
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
                    <strong key={revealed ? player.name : "rolling"} className={revealed ? styles.revealedName : styles.rollingName}>{revealed ? player.name : scene.kind === "draw" ? rolling.name : tx("빈 자리")}{revealed && index === myPlayer && <small> {tx("· 나")}</small>}</strong>
                    <span>{revealed ? roleNames[player.role] : scene.kind === "draw" ? tx("추첨 중") : roleNames[slotRoles[row]]}</span>
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
