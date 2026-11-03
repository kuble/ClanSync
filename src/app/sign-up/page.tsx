import { getTranslator } from "@/lib/i18n/server";
import { AuthShell } from "@/components/entry/auth-shell";
import { SignUpForm } from "./sign-up-form";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export async function generateMetadata() {
  const tx = await getTranslator();
  return { title: tx("회원가입 · ClanSync") };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell mode="sign-up"><SignUpForm nextPath={safeNextPath(next)} /></AuthShell>;
}
