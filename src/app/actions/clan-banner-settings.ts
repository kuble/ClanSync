"use server";

import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { clanHasActivePurchaseForItemSlug } from "@/lib/store/store-purchase-queries";
import type { MvpStoreSlug } from "@/lib/store/mvp-store-slugs";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export type UpdateClanBannerUrlResult =
  | { ok: true }
  | { ok: false; error: string };

const BANNER_SLUG: MvpStoreSlug = "clan_banner_slot";

function normalizeHttpsUrl(raw: string): string | null {
  const t = raw.trim();
  if (t.length === 0) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return null;
    return u.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

export async function updateClanBannerUrlAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<UpdateClanBannerUrlResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_pool",
  );
  if (!allowed) {
    return { ok: false, error: "클랜 꾸미기·풀 지출 권한이 없습니다." };
  }

  const raw = String(formData.get("banner_url") ?? "");
  const nextUrl = normalizeHttpsUrl(raw);
  if (raw.trim().length > 0 && nextUrl === null) {
    return {
      ok: false,
      error: "배너 URL은 비우거나 https:// 로 시작하는 주소만 가능합니다.",
    };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();
  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const unlocked = await clanHasActivePurchaseForItemSlug(
    svc,
    clanId,
    BANNER_SLUG,
  );
  if (!unlocked) {
    return {
      ok: false,
      error: "클랜 배너 슬롯을 먼저 스토어에서 구매해 주세요.",
    };
  }

  const { error } = await svc
    .from("clans")
    .update({ banner_url: nextUrl })
    .eq("id", clanId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}`);
  revalidatePath(`/games/${gameSlug}/clan/${clanId}/manage`);
  return { ok: true };
}
