import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata = {
  title: "회원가입 · ClanSync",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <SignUpForm />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        <Link href="/" className="underline-offset-4 hover:underline">
          ← 처음으로
        </Link>
      </p>
    </main>
  );
}
