import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/onboarding/account-shell";
import { ProfileHousing } from "@/components/profile/profile-housing";
import { createClient } from "@/lib/supabase/server";
import { loadHousingState } from "@/lib/housing/load";

export default async function LegacyMiniroomPage() {
  const client = await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)redirect("/sign-in?next=/profile/miniroom");
  return <AccountShell context="기존 미니룸"><main className="mx-auto max-w-5xl p-6"><Link href="/profile" className="text-sm underline">진열장으로 돌아가기</Link><h1 className="my-4 text-xl font-semibold">기존 미니룸 보관함</h1><p className="mb-6 text-sm text-muted-foreground">기존 가구와 배치는 그대로 보관되어 있습니다.</p><ProfileHousing key={user.id} userId={user.id} initial={await loadHousingState()}/></main></AccountShell>;
}
