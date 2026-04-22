import type { Json } from "@/lib/supabase/database.types";
import { toKstParts } from "./kst";

const TOP_OPTIONS = new Set([3, 5, 10, 20, 999]);

export type ResolvedHofConfig = {
  winRateVisibleTop: number;
  participationVisibleTop: number;
  cumulativeVisibleTop: number;
  monthlyRankVisibility: "always" | "month_start";
  yearlyRankVisibility: "always" | "year_start";
  eligibilityGameThreshold: number;
  eligibilityBelowPct: number;
  eligibilityAboveMinGames: number;
};

export const HOF_CONFIG_DEFAULTS: ResolvedHofConfig = {
  winRateVisibleTop: 10,
  participationVisibleTop: 10,
  cumulativeVisibleTop: 10,
  monthlyRankVisibility: "always",
  yearlyRankVisibility: "always",
  eligibilityGameThreshold: 100,
  eligibilityBelowPct: 30,
  eligibilityAboveMinGames: 30,
};

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function topCoerce(v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const r = Math.round(v);
  return TOP_OPTIONS.has(r) ? r : fallback;
}

function monthVis(v: unknown): "always" | "month_start" {
  return v === "month_start" ? "month_start" : "always";
}

function yearVis(v: unknown): "always" | "year_start" {
  return v === "year_start" ? "year_start" : "always";
}

/** clan_settings.hof_config jsonb → 앱에서 쓰는 정규화 값 */
export function resolveHofConfig(raw: Json | undefined): ResolvedHofConfig {
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    winRateVisibleTop: topCoerce(
      o.win_rate_visible_top,
      HOF_CONFIG_DEFAULTS.winRateVisibleTop,
    ),
    participationVisibleTop: topCoerce(
      o.participation_visible_top,
      HOF_CONFIG_DEFAULTS.participationVisibleTop,
    ),
    cumulativeVisibleTop: topCoerce(
      o.cumulative_visible_top,
      HOF_CONFIG_DEFAULTS.cumulativeVisibleTop,
    ),
    monthlyRankVisibility: monthVis(o.monthly_rank_visibility),
    yearlyRankVisibility: yearVis(o.yearly_rank_visibility),
    eligibilityGameThreshold: num(
      o.eligibility_game_threshold,
      HOF_CONFIG_DEFAULTS.eligibilityGameThreshold,
      1,
      5000,
    ),
    eligibilityBelowPct: num(
      o.eligibility_below_pct,
      HOF_CONFIG_DEFAULTS.eligibilityBelowPct,
      1,
      100,
    ),
    eligibilityAboveMinGames: num(
      o.eligibility_above_min_games,
      HOF_CONFIG_DEFAULTS.eligibilityAboveMinGames,
      1,
      2000,
    ),
  };
}

export function minGamesToQualify(
  totalClanIntraGames: number,
  cfg: ResolvedHofConfig,
): number {
  if (totalClanIntraGames <= cfg.eligibilityGameThreshold) {
    return Math.ceil(totalClanIntraGames * (cfg.eligibilityBelowPct / 100));
  }
  return cfg.eligibilityAboveMinGames;
}

/** 이번 달 탭: 매월 1일 공개 모드면 집계 중(비공개) */
export function isHofMonthTabUndisclosed(cfg: ResolvedHofConfig): boolean {
  return cfg.monthlyRankVisibility === "month_start";
}

/** 올해 탭: 매년 1월 1일 공개 모드면 집계 중(비공개) */
export function isHofYearTabUndisclosed(cfg: ResolvedHofConfig): boolean {
  return cfg.yearlyRankVisibility === "year_start";
}

/** D-STATS-03 각주·라벨용 — 현재 KST 연·월 */
export function currentKstYearMonth(now = new Date()) {
  const { y, m } = toKstParts(now);
  return { year: y, month: m };
}
