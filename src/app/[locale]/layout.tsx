import type { ReactNode } from "react";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  await params;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
