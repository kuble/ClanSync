import { AuthShell } from "@/components/entry/auth-shell";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "로그인 · ClanSync" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/games";
  return <AuthShell mode="sign-in"><SignInForm nextPath={nextPath} /></AuthShell>;
}
