import { useTranslator } from "#use-translator";
import { PageLoading } from "@/components/ui/page-loading";

export default function ClanLoading() {
  const tx = useTranslator();
  return <PageLoading label={tx("클랜 페이지를 불러오는 중…")} />;
}
