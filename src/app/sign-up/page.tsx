import { AuthShell } from "@/components/entry/auth-shell";
import { SignUpForm } from "./sign-up-form";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata = { title: "회원가입 · ClanSync" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell mode="sign-up"><SignUpForm nextPath={safeNextPath(next)} /></AuthShell>;
}
