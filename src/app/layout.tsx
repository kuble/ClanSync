import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClanSync",
  description: "게임 클랜/길드 커뮤니티 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        {/* Tooltip 트리와 분리 + 클라이언트에서 document.body 포털 (sonner.tsx) */}
        <Toaster />
      </body>
    </html>
  );
}
