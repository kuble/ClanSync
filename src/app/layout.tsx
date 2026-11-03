import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { getTranslator, loadMessages, readLanguage } from "@/lib/i18n/server";
import { LanguageProvider } from "@/components/ui/language-provider";

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

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getTranslator();
  return {
  title: "ClanSync",
  description: tx("게임 클랜/길드 커뮤니티 플랫폼"),
};
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await readLanguage();
  return (
    <html
      lang={language}
      data-scroll-behavior="smooth"
      className={`${pretendard.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="clansync-theme" disableTransitionOnChange>
          <LanguageProvider language={language} messages={await loadMessages(language)}><TooltipProvider>{children}</TooltipProvider></LanguageProvider>
          {/* Tooltip 트리와 분리 + 클라이언트에서 document.body 포털 (sonner.tsx) */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
