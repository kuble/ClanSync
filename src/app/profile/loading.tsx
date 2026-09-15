import { PageLoading } from "@/components/ui/page-loading";

export default function ProfileLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-10">
      <PageLoading label="프로필을 불러오는 중…" />
    </main>
  );
}
