/**
 * D-PERM-01 — 부재 키 시 적용되는 역할 허용 배열 (decisions.md 표와 동일).
 * 잠긴 키는 hasClanPermission 에서 DB/JSON 무시하고 강제한다.
 */
export const CLAN_PERMISSION_DEFAULTS = {
  manage_subscription: ["leader"],
  delegate_leader: ["leader"],
  kick_officer: ["leader"],
  bulk_kick_dormant: ["leader"],
  kick_member: ["leader", "officer"],
  approve_join_requests: ["leader", "officer"],
  edit_mscore: ["leader"],
  set_hof_rules: ["leader"],
  view_match_records: ["leader", "officer"],
  correct_match_records: ["leader"],
  export_csv: ["leader"],
  manage_clan_events: ["leader", "officer"],
  confirm_scrim: ["leader", "officer"],
  manage_promo: ["leader", "officer"],
  manage_clan_pool: ["leader", "officer"],
  view_alt_accounts: ["leader", "officer", "member"],
  view_monthly_stats: ["leader", "officer"],
  view_yearly_stats: ["leader", "officer"],
  view_synergy_winrate: ["leader", "officer"],
  view_map_winrate: ["leader", "officer"],
  view_mscore: ["leader", "officer"],
} as const satisfies Record<string, readonly string[]>;

export type ClanPermissionKey = keyof typeof CLAN_PERMISSION_DEFAULTS;

/** 리더 고정 (jsonb 에 잘못 저장돼도 무시). */
export const LOCKED_LEADER_ONLY = new Set<ClanPermissionKey>([
  "manage_subscription",
  "delegate_leader",
  "kick_officer",
  "bulk_kick_dormant",
]);

/** 운영진+ 고정. */
export const LOCKED_OFFICER_PLUS = new Set<ClanPermissionKey>(["confirm_scrim"]);

export type ClanMemberRole = "leader" | "officer" | "member";
