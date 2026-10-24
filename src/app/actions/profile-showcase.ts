"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ShowcaseDocument } from "@/lib/showcase/domain";

export async function saveShowcaseAction(document: ShowcaseDocument, revision: number, expectedUserId: string): Promise<{ ok: true; revision: number } | { ok: false; error: string }> {
  if (!document || !Number.isSafeInteger(revision) || revision < -1 || JSON.stringify(document).length > 100000) return { ok: false, error: "진열장 구성을 확인해 주세요." };
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user || user.id !== expectedUserId) return { ok: false, error: "로그인한 계정이 변경되었습니다. 프로필을 다시 열어 주세요." };
    const { data, error } = await client.rpc("save_showcase_library", { p_revision: revision, p_document: document });
    if (error) return { ok: false, error: error.message.includes("SHOWCASE_CONFLICT") ? "다른 화면에서 변경되었습니다. 현재 편집을 복사해 두거나 최신 저장 내용을 불러와 주세요." : "저장하지 못했습니다. 보유 굿즈와 구성을 확인한 뒤 다시 시도해 주세요." };
    revalidatePath("/profile"); revalidatePath(`/profile/${user.id}`);
    return { ok: true, revision: data as number };
  } catch { return { ok: false, error: "저장하지 못했습니다. 변경 내용은 유지됩니다. 다시 시도해 주세요." }; }
}

export async function claimShowcaseProductAction(catalogId: string, expectedUserId: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(catalogId)) return { ok: false, error: "상품을 확인해 주세요." };
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user || user.id !== expectedUserId) return { ok: false, error: "계정이 변경되었습니다. 다시 로그인해 주세요." };
    const { error } = await client.rpc("claim_showcase_product", { p_catalog_id: catalogId });
    if (error) return { ok: false, error: "굿즈를 받지 못했습니다. 다시 시도해 주세요." };
    revalidatePath("/profile"); revalidatePath("/store");
    return { ok: true };
  } catch { return { ok: false, error: "굿즈를 받지 못했습니다. 다시 시도해 주세요." }; }
}
