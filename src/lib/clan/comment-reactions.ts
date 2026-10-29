export const COMMENT_REACTIONS = [
  { kind: "like", emoji: "👍", label: "좋아요" },
  { kind: "heart", emoji: "❤️", label: "하트" },
  { kind: "laugh", emoji: "😆", label: "웃음" },
  { kind: "clap", emoji: "👏", label: "박수" },
  { kind: "surprised", emoji: "😮", label: "놀람" },
  { kind: "sad", emoji: "😢", label: "슬픔" },
] as const;

export type CommentReactionKind = (typeof COMMENT_REACTIONS)[number]["kind"];
export type CommentReaction = { kind: CommentReactionKind; count: number; mine: boolean };
