import { useTranslator } from "#use-translator";
import { PageLoading } from "@/components/ui/page-loading";

export default function GameLoading() {
  const tx = useTranslator();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 py-20 sm:px-7">
      <PageLoading label={tx("게임 페이지를 불러오는 중…")} />
    </main>
  );
}
