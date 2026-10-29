import Image from "next/image";
import { readClanBannerUrl } from "@/lib/clan/banner-catalog";
import { ClanBannerArtwork } from "./clan-banner-artwork";

export function ClanBannerImage({ url, alt = "", sizes = "100vw" }: { url: string; alt?: string; sizes?: string }) {
  const selection = readClanBannerUrl(url);
  return selection ? <ClanBannerArtwork selection={selection} /> : <Image src={url} alt={alt} fill sizes={sizes} unoptimized className="object-cover" />;
}
