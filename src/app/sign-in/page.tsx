import { SignInShell } from "@/components/entry/sign-in-shell";
import { SignInForm } from "./sign-in-form";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata = { title: "로그인 · ClanSync" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  return <SignInShell><SignInForm nextPath={nextPath} /></SignInShell>;
}
