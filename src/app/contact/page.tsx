import { MessagesSquare } from "lucide-react";
import { ServiceInfoPage } from "@/components/entry/service-info-page";
import styles from "@/components/entry/service-info.module.css";

export const metadata = { title: "문의하기 · ClanSync", description: "ClanSync 이용 문의, 오류 제보와 기능 제안 안내입니다." };

export default function ContactPage() {
  return <ServiceInfoPage current="/contact" title="문의하기" description="이용 중 궁금한 점과 더 나아졌으면 하는 점을 들려주세요.">
    <section className={styles.contact}><MessagesSquare size={26} aria-hidden="true" /><h2>공식 Discord에서 만나요.</h2><p>ClanSync 커뮤니티를 문의와 소통의 공간으로 준비하고 있습니다. 초대 주소가 정해지면 이곳에서 바로 연결합니다.</p><button type="button" disabled>Discord 연결 준비 중</button></section>
    <section><h2>이런 내용을 나눌 수 있습니다.</h2><dl>
      <div><dt>이용 문의</dt><dd>가입·계정·게임 연결 등 서비스를 이용하며 궁금한 점</dd></div>
      <div><dt>오류 제보</dt><dd>문제가 발생한 화면과 재현 순서, 기대한 결과와 실제 결과</dd></div>
      <div><dt>기능 제안</dt><dd>클랜 운영에서 불편한 점과 새로 필요하다고 느끼는 기능</dd></div>
    </dl></section>
    <section><h2>화면을 첨부할 때</h2><p>이메일 등 개인 정보가 보이는 부분은 가려서 첨부해 주십시오. 개인정보 관련 요청을 위한 별도 접수 창구는 준비 중입니다.</p></section>
  </ServiceInfoPage>;
}
