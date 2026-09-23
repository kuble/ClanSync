import Link from "next/link";

export default function Forbidden() {
  return <main className="mx-auto max-w-lg space-y-4 px-6 py-20 text-center">
    <h1 className="text-xl font-semibold">접근 권한이 없습니다</h1>
    <p className="text-sm text-muted-foreground">운영 권한이 있는 계정으로 확인해 주세요.</p>
    <Link href="/games" className="inline-block text-sm underline">게임 목록으로</Link>
  </main>;
}
