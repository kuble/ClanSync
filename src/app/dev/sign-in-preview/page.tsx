import { notFound } from "next/navigation";
import { SignInShell } from "@/components/entry/sign-in-shell";
import { SignInForm } from "@/app/sign-in/sign-in-form";

export const metadata = {
  title: "로그인 미리보기 · ClanSync",
  robots: { index: false, follow: false },
};

export default function SignInPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <SignInShell><SignInForm nextPath="/games" /></SignInShell>;
}
