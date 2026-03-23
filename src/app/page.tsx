import { redirect } from "next/navigation";

/** 기본 로케일은 추후 미들웨어·사용자 설정과 맞출 수 있음 */
export default function RootPage() {
  redirect("/ko");
}
