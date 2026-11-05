import { getTranslator } from "@/lib/i18n/server";
import { useTranslator } from "#use-translator";
import { ArrowUpRight, MessagesSquare } from "lucide-react";
import { ServiceInfoPage } from "@/components/entry/service-info-page";
import styles from "@/components/entry/service-info.module.css";

export async function generateMetadata() {
  const tx = await getTranslator();
  return { title: tx("문의하기 · ClanSync"), description: tx("ClanSync 이용 문의, 오류 제보와 기능 제안 안내입니다.") };
}

export default function ContactPage() {
  const tx = useTranslator();
  return <ServiceInfoPage current="/contact" title={tx("문의하기")} description={tx("이용 중 궁금한 점과 더 나아졌으면 하는 점을 알려주십시오.")}>
    <section className={styles.contact}><MessagesSquare size={26} aria-hidden="true" /><h2>{tx("공식 Discord에서 문의할 수 있습니다.")}</h2><p>{tx("ClanSync 공식 커뮤니티에서 이용 문의와 오류 제보, 기능 제안을 남겨주십시오.")}</p><a href="https://discord.gg/Ss6ezVqh3B" target="_blank" rel="noopener noreferrer" className={styles.discordLink}>{tx("공식 Discord 참여하기")}<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> {tx("(새 탭)")}</span></a></section>
    <section><h2>{tx("이런 내용을 나눌 수 있습니다.")}</h2><dl>
      <div><dt>{tx("이용 문의")}</dt><dd>{tx("가입·계정·게임 연결 등 서비스를 이용하며 궁금한 점")}</dd></div>
      <div><dt>{tx("오류 제보")}</dt><dd>{tx("문제가 발생한 화면과 재현 순서, 기대한 결과와 실제 결과")}</dd></div>
      <div><dt>{tx("기능 제안")}</dt><dd>{tx("클랜 운영에서 불편한 점과 새로 필요하다고 느끼는 기능")}</dd></div>
    </dl></section>
    <section><h2>{tx("화면을 첨부할 때")}</h2><p>{tx("이메일 등 개인 정보가 보이는 부분은 가려서 첨부해 주십시오. 개인정보 관련 요청을 위한 별도 접수 창구는 준비 중입니다.")}</p></section>
  </ServiceInfoPage>;
}
