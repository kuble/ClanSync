export const HOF_COMMENT_RANKINGS = ["rate", "attendance", "appearances", "prediction"] as const;
export type HofCommentRanking = (typeof HOF_COMMENT_RANKINGS)[number];
export type HofCommentThread = { clanId: string; ranking: HofCommentRanking; periodKey: string };
export const HOF_REACTIONS = [
  { kind: "like", emoji: "👍", label: "좋아요" },
  { kind: "heart", emoji: "❤️", label: "하트" },
  { kind: "laugh", emoji: "😆", label: "웃음" },
  { kind: "clap", emoji: "👏", label: "박수" },
  { kind: "surprised", emoji: "😮", label: "놀람" },
  { kind: "sad", emoji: "😢", label: "슬픔" },
] as const;
export type HofReactionKind = (typeof HOF_REACTIONS)[number]["kind"];
export type HofReaction = { kind: HofReactionKind; count: number; mine: boolean };
export type HofComment = { id: string; content: string; createdAt: string; nickname: string; canDelete: boolean; reactions: HofReaction[] };
export const HOF_COMMENT_PAGE_SIZE = 30;
export const HOF_COMMENT_MAX_LENGTH = 500;

export function validHofCommentThread(thread: HofCommentThread): boolean {
  return !!thread && typeof thread.clanId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread.clanId)
    && HOF_COMMENT_RANKINGS.includes(thread.ranking)
    && typeof thread.periodKey === "string"
    && /^(all|[1-9][0-9]{3}(-(0[1-9]|1[0-2]))?)$/.test(thread.periodKey);
}
