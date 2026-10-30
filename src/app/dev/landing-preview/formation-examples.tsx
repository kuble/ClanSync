"use client";

import { ClanBalanceRosterBoard } from "@/components/main-clan/clan-balance-roster-board";
import { ClanBalanceHeroBanClient } from "@/components/main-clan/clan-balance-hero-ban-client";
import { PredictionPoolView } from "@/components/main-clan/prediction-pool-view";
import type { BalanceRoster } from "@/lib/balance/roster-schema";

const names = ["여울", "노을", "루나", "하루", "소다", "모카", "구름", "별빛", "라임", "우주"];
const pool = names.map((nickname, i) => ({ user_id: `example-${i}`, nickname }));
const roster: BalanceRoster = {
  team1: { tank: "example-0", dmg: ["example-1", "example-2"], sup: ["example-3", "example-4"] },
  team2: { tank: "example-5", dmg: ["example-6", "example-7"], sup: ["example-8", "example-9"] },
};
const noop = () => {};

export function FormationExample() {
  return <div inert><ClanBalanceRosterBoard roster={roster} pool={pool} showPlayerCardInfo={false} showPlayerCardScore={false} showPlayerSessionSummary={false} showTeamComparisonSummary={false} /></div>;
}

export function HeroBanExample() {
  return <div inert><ClanBalanceHeroBanClient gameSlug="overwatch" clanId="landing-example" sessionId="landing-example" deadlineIso={null}
    serverNow={1793361600000} myVote={null} canResolve={false} userId="observer" roster={roster} bansPerTeam={1}
    resolvedHeroes={["cassidy", "ana"]} allVotes={[
      { user_id: "example-0", pick_1: "cassidy", pick_2: null, pick_3: null },
      { user_id: "example-1", pick_1: "cassidy", pick_2: null, pick_3: null },
      { user_id: "example-5", pick_1: "ana", pick_2: null, pick_3: null },
      { user_id: "example-6", pick_1: "ana", pick_2: null, pick_3: null },
    ]} /></div>;
}

export function PredictionExample() {
  return <div inert><PredictionPoolView
    pool={{ hostOnly: false, total: 1000, count: 8, teams: [600, 300, 100], balance: 500, mine: null, ranking: [] }}
    pick={1} amount="100" pending={false} remaining={90} resolved={false} expired={false}
    canBet available={500} isParticipant={false} live predictionMinutes={3}
    setPick={noop} setAmount={noop} submit={noop} /></div>;
}
