"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

function allowDevPlanToggle(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_CLAN_PLAN_TOGGLE === "1"
  );
}

/** 실결제 없이 클랜 free↔premium 전환 (QA·로컬). 클랜장만. */
export async function toggleClanPlanDevFormAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  if (!allowDevPlanToggle()) {
    throw new Error("허용되지 않은 환경입니다.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: mRows } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const m = mRows?.[0];

  if (m?.status !== "active" || m?.role !== "leader") {
    throw new Error("클랜장만 플랜을 전환할 수 있습니다.");
  }

  const svc = createServiceRoleClient();
  const { data: clan, error: rErr } = await svc
    .from("clans")
    .select("subscription_tier")
    .eq("id", clanId)
    .single();

  if (rErr || !clan) throw new Error("클랜을 찾을 수 없습니다.");

  const next = clan.subscription_tier === "premium" ? "free" : "premium";
  const { error: uErr } = await svc
    .from("clans")
    .update({ subscription_tier: next })
    .eq("id", clanId);

  if (uErr) throw new Error(uErr.message);

  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/store`);
}
