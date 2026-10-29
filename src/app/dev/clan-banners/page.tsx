import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClanBannerStudio } from "@/components/cosmetics/clan-banner-studio";
import { DEFAULT_CLAN_BANNER_SELECTION, readClanBannerSelection } from "@/lib/clan/banner-catalog";

export const metadata: Metadata = { title: "클랜 배너 스튜디오 | ClanSync", robots: { index: false, follow: false } };

export default async function ClanBannerStudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const selection = readClanBannerSelection({ designId: query.design, paletteId: query.palette }) ?? DEFAULT_CLAN_BANNER_SELECTION;
  return <ClanBannerStudio initialSelection={selection} />;
}
