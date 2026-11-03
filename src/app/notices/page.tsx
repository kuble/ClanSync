import { getTranslator } from "@/lib/i18n/server";
import { useTranslator } from "#use-translator";
import { Megaphone } from "lucide-react";
import { ServiceInfoPage } from "@/components/entry/service-info-page";
import styles from "@/components/entry/service-info.module.css";

export async function generateMetadata() {
  const tx = await getTranslator();
  return { title: tx("공지사항 · ClanSync"), description: tx("ClanSync의 서비스 업데이트와 운영 소식을 안내합니다.") };
}

export default function NoticesPage() {
  const tx = useTranslator();
  return <ServiceInfoPage current="/notices" title={tx("공지사항")} description={tx("ClanSync의 새로운 소식과 서비스 이용에 필요한 안내를 전합니다.")}>
    <div className={styles.empty}><Megaphone size={28} aria-hidden="true" /><h2>{tx("아직 등록된 공지사항이 없습니다.")}</h2><p>{tx("서비스 업데이트와 점검 소식을 이곳에서 안내합니다.")}</p></div>
  </ServiceInfoPage>;
}
