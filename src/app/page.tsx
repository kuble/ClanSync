import type { Metadata } from "next";
import { LandingPage } from "@/components/entry/landing/landing-page";

export const metadata: Metadata = {
  title: "ClanSync — 클랜 운영을 한곳에서",
  description: "내전 팀 편성부터 경기 기록과 통계, 사진·일정·알림까지. ClanSync에서 클랜 운영을 한결 편하게 시작하세요.",
};

export default function RootPage() {
  return <LandingPage />;
}
