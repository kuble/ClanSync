import Link from "next/link";
import { ServiceInfoPage } from "@/components/entry/service-info-page";

export const metadata = { title: "이용약관 · ClanSync", robots: { index: false, follow: false } };

export default function TermsPage() {
  return <ServiceInfoPage current="/terms" title="이용약관" description="ClanSync를 함께 이용하기 위한 기본 내용을 정리했습니다." draft>
    <section><h2>1. 서비스 소개</h2><p>ClanSync는 게임 클랜의 팀 편성, 경기 기록과 통계, 일정 및 커뮤니티 활동을 지원합니다. 현재 지원하는 게임과 기능은 서비스 화면에서 확인할 수 있으며 게임별로 제공 범위가 다를 수 있습니다.</p></section>
    <section><h2>2. 계정과 게임 정보</h2><p>회원은 본인이 사용하는 이메일로 계정을 만들고 계정 정보를 관리합니다. 게임별 ID와 클랜 정보는 가입 후 별도로 등록합니다. 다른 사람의 계정을 사용하거나 허락 없이 게임 ID를 도용해서는 안 됩니다.</p></section>
    <section><h2>3. 클랜 운영과 참여</h2><p>클랜장·운영진·멤버에게 제공되는 기능은 역할에 따라 다릅니다. 클랜의 참가 조건과 운영 규칙은 해당 클랜에서 확인하고, 다른 구성원의 활동을 존중해 주십시오.</p></section>
    <section><h2>4. 게시물과 사진</h2><p>회원은 자신이 등록하는 글과 사진 등 자료에 필요한 권리를 확인해야 합니다. 타인의 권리를 침해하거나 개인정보를 무단으로 공개하는 자료를 등록해서는 안 됩니다.</p><p>구체적인 게시물 처리·신고·이의 제기 기준은 운영 기준을 확정한 뒤 정식 약관에 반영합니다.</p></section>
    <section><h2>5. 이용 시 지켜야 할 사항</h2><ul><li>다른 이용자의 계정을 도용하거나 서비스를 방해하는 행위</li><li>허위 정보나 반복적인 광고를 등록하는 행위</li><li>다른 사람을 괴롭히거나 권리를 침해하는 행위</li></ul><p>위와 같은 행위에 대한 처리 절차와 이용 제한 기준은 정식 약관에서 안내합니다.</p></section>
    <section><h2>6. 코인과 유료 기능</h2><p>코인은 서비스 안의 활동과 꾸미기 등에 사용하는 가상 재화입니다. 현재 구독 결제는 준비 중이며, 유료 기능을 출시할 때 요금·이용 조건·취소 및 환불 기준을 별도로 안내합니다.</p></section>
    <section><h2>7. 탈퇴와 공동 기록</h2><p>회원은 프로필의 계정 정보에서 탈퇴를 요청할 수 있습니다. 다른 구성원과 함께 만든 경기·클랜 운영 기록은 계정 연결이 해제된 뒤에도 남을 수 있습니다. 보존 항목과 처리 기준은 <Link href="/privacy">개인정보처리방침</Link>에서 함께 안내합니다.</p></section>
    <section><h2>8. 운영자와 문의</h2><p>운영자 표기, 시행일, 서비스 변경·제한의 세부 절차는 확정 후 반영합니다. 서비스 문의 창구의 준비 상황은 <Link href="/contact">문의하기</Link>에서 확인할 수 있습니다.</p></section>
  </ServiceInfoPage>;
}
