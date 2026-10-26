export type PlayerDemographics = {
  birthYear: number | null;
  gender: "male" | "female" | "undisclosed" | null;
};

export type PlayerProfile = PlayerDemographics & { battleTag: string | null; clanJoinedAt?: string | null };

export function playerProfileDetails(profile?: PlayerDemographics): string {
  if (!profile) return "";
  const gender = profile.gender === "male" ? "남성" : profile.gender === "female" ? "여성" : profile.gender === "undisclosed" ? "성별 비공개" : "";
  return [gender, profile.birthYear ? `${profile.birthYear}년생` : ""].filter(Boolean).join(" · ");
}
