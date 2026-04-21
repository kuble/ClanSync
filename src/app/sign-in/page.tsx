import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "로그인 · ClanSync",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/games";

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <SignInForm nextPath={nextPath} />
      <p className="text-muted-foreground mt-8 text-center text-sm">
        <Link href="/" className="underline-offset-4 hover:underline">
          ← 처음으로
        </Link>
      </p>
    </main>
  );
}
