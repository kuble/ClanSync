import { AuthShell } from "@/components/entry/auth-shell";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "회원가입 · ClanSync" };

export default function SignUpPage() {
  return <AuthShell mode="sign-up"><SignUpForm /></AuthShell>;
}
