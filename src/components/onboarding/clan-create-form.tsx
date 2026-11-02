import { ClanPromotionSettings } from "@/components/main-clan/clan-promotion-settings";

export function ClanCreateForm({ gameSlug }: { gameSlug: string }) {
  return <ClanPromotionSettings gameSlug={gameSlug} clanId={null} post={null} initial={{
    id: "", name: "", description: null, max_members: 30, active_members: 1,
    birth_year_from: null, min_birth_year: null, gender_policy: "all", tier_range: [],
    promotion_public: true, style: null, recruitment_positions: [],
  }} />;
}
