import { getTranslator } from "@/lib/i18n/server";
import { AuthShell } from "@/components/entry/auth-shell";
import { SignInForm } from "./sign-in-form";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export async function generateMetadata() {
  const tx = await getTranslator();
  return { title: tx("로그인 · ClanSync") };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  return <AuthShell mode="sign-in"><SignInForm nextPath={nextPath} /></AuthShell>;
}
