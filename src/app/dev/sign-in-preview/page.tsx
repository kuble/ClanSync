import { notFound } from "next/navigation";
import { AuthShell } from "@/components/entry/auth-shell";
import { SignInForm } from "@/app/sign-in/sign-in-form";

export const metadata = {
  title: "로그인 미리보기 · ClanSync",
  robots: { index: false, follow: false },
};

export default function SignInPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AuthShell mode="sign-in"><SignInForm nextPath="/games" /></AuthShell>;
}
