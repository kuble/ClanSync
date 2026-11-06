"use client";

import dynamic from "next/dynamic";

// 선택한 관리 화면의 코드만 내려받고 다른 탭의 편집기·차트는 열 때 불러온다.
export const ClanManageNotices = dynamic(() => import("./clan-manage-notices").then(m => m.ClanManageNotices));
export const ClanManageRules = dynamic(() => import("./clan-manage-notices").then(m => m.ClanManageRules));
export const ClanAppearanceSettings = dynamic(() => import("./clan-appearance-settings").then(m => m.ClanAppearanceSettings));
export const ClanEmojiSettings = dynamic(() => import("./clan-emoji-settings").then(m => m.ClanEmojiSettings));
export const ClanBalanceAutoCloseSettings = dynamic(() => import("./clan-balance-auto-close-settings").then(m => m.ClanBalanceAutoCloseSettings));
export const ManageJoinRequestsPanel = dynamic(() => import("./manage-join-requests-panel").then(m => m.ManageJoinRequestsPanel));
export const ManageMembersTable = dynamic(() => import("./manage-members-table").then(m => m.ManageMembersTable));
export const ClanManageSubscriptionPanel = dynamic(() => import("./clan-manage-subscription-panel").then(m => m.ClanManageSubscriptionPanel));
export const ClanManageStoreVoidPanel = dynamic(() => import("./clan-manage-store-void-panel").then(m => m.ClanManageStoreVoidPanel));
export const ClanFormationStats = dynamic(() => import("./clan-formation-stats").then(m => m.ClanFormationStats));
export const ClanSiteUsagePanel = dynamic(() => import("./clan-site-usage-panel").then(m => m.ClanSiteUsagePanel));
export const ClanDiscordSettings = dynamic(() => import("./clan-discord-settings").then(m => m.ClanDiscordSettings));
export const ClanCommunityLinksForm = dynamic(() => import("./clan-community-links-form").then(m => m.ClanCommunityLinksForm));
export const ClanPromotionSettings = dynamic(() => import("./clan-promotion-settings").then(m => m.ClanPromotionSettings));
