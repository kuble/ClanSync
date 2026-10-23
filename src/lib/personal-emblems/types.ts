export type AwardFamily = "victory" | "participation" | "appearances" | "streak" | "prediction";
export type MilestoneFamily = "sessions" | "matches" | "wins" | "streak" | "prediction";

export type PersonalEmblem = {
  key: string;
  kind: "award" | "milestone";
  family: AwardFamily | MilestoneFamily;
  name: string;
  description: string;
  artwork: string;
  earned: boolean;
  date: string | null;
  period?: "month" | "year";
  rank?: number;
  stage?: number;
  target?: number;
  progress?: number;
  unit?: string;
};

export type PersonalEmblemCollection = {
  clanId: string;
  clanName: string;
  gameSlug: string;
  userId: string;
  viewerId: string;
  nickname: string;
  canFeature: boolean;
  emblems: PersonalEmblem[];
  /** null uses recent earned emblems; an empty array deliberately displays no picks. */
  featuredKeys: string[] | null;
};
