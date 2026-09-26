export const HOF_COMMENT_RANKINGS = ["rate", "attendance", "appearances", "prediction"] as const;
export type HofCommentRanking = (typeof HOF_COMMENT_RANKINGS)[number];
export type HofCommentThread = { clanId: string; ranking: HofCommentRanking; periodKey: string };
export type HofComment = { id: string; content: string; createdAt: string; nickname: string; canDelete: boolean };
export const HOF_COMMENT_PAGE_SIZE = 30;
export const HOF_COMMENT_MAX_LENGTH = 500;

export function validHofCommentThread(thread: HofCommentThread): boolean {
  return !!thread && typeof thread.clanId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread.clanId)
    && HOF_COMMENT_RANKINGS.includes(thread.ranking)
    && typeof thread.periodKey === "string"
    && /^(all|[1-9][0-9]{3}(-(0[1-9]|1[0-2]))?)$/.test(thread.periodKey);
}
