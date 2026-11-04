import type { ReactNode } from "react";
import { AccountShell } from "@/components/onboarding/account-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return <AccountShell context="개인 상점">{children}</AccountShell>;
}
