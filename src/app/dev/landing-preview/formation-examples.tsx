"use client";

import { BalanceAuctionStage } from "@/components/main-clan/balance-auction-stage";
import { PredictionPoolView } from "@/components/main-clan/prediction-pool-view";
import type { FormationState } from "@/lib/balance/formation";
import { EMPTY_ROSTER } from "@/lib/balance/roster-schema";

const names = ["여울", "노을", "루나", "하루", "소다", "모카", "구름", "별빛", "라임", "우주"];
const now = Date.parse("2026-10-30T21:00:00+09:00");
const state: FormationState = {
  version: 1, mode: "auction", stage: "auction",
  players: names.map((_, index) => ({ id: String(index), role: index % 5 === 0 ? "tank" : index % 5 < 3 ? "dmg" : "sup" })),
  order: names.map((_, index) => String(index)), captains: ["0", "5"], first: "team1", picks: 0,
  roster: { team1: { ...EMPTY_ROSTER.team1, tank: "0" }, team2: { ...EMPTY_ROSTER.team2, tank: "5" } },
  sourceRoster: EMPTY_ROSTER, budgets: { team1: 1000, team2: 1000 },
  remaining: ["2", "1", "3", "4", "6", "7", "8", "9"],
  auction: { player: "2", startedAt: now - 15000, deadline: now + 15000, bid: 260, team: "team1", retry: false },
  pausedAt: null, log: [],
};
const noop = () => {};

export function AuctionExample() {
  return <div inert><BalanceAuctionStage state={state} now={now} pending={false} revealing={false}
    name={id => names[Number(id)]} canTeam={team => team === "team2"} canBid={team => team === "team2"} run={noop} /></div>;
}

export function PredictionExample() {
  return <div inert><PredictionPoolView
    pool={{ hostOnly: false, total: 1000, count: 8, teams: [600, 300, 100], balance: 500, mine: null,
      ranking: [{ user_id: "example", nickname: "모카", played: 8, hits: 6, profit: 240 }] }}
    pick={1} amount="100" pending={false} remaining={90} resolved={false} expired={false}
    canBet available={500} isParticipant={false} live predictionMinutes={3}
    setPick={noop} setAmount={noop} submit={noop} /></div>;
}
