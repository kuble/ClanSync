import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/entry/landing/landing-page";

export const metadata: Metadata = {
  title: "랜딩 미리보기 · ClanSync",
  robots: { index: false, follow: false },
};

export default function LandingPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LandingPage />;
}
