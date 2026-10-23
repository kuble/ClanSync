"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { housingRpcResult, loadHousingState } from "@/lib/housing/load";
import { HOUSING_FLOORS, HOUSING_SURFACES, HOUSING_WALLPAPERS } from "@/lib/housing/domain";
import type { HousingResult, SaveHousingRoomInput } from "@/lib/housing/types";

export async function loadHousingAction(): Promise<HousingResult> {
  return loadHousingState();
}

export async function purchaseHousingFurnitureAction(input: { catalogId: string }): Promise<HousingResult> {
  if (!input || typeof input.catalogId !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(input.catalogId)) {
    return { ok: false, error: "구매할 가구를 확인해 주세요." };
  }
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };
    const { data, error } = await client.rpc("purchase_housing_furniture", { p_catalog_id: input.catalogId });
    const result = housingRpcResult(data, error);
    if (result.ok) { revalidatePath("/profile"); revalidatePath("/store"); }
    return result;
  } catch {
    return { ok: false, error: "가구를 구매하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function saveHousingRoomAction(input: SaveHousingRoomInput, expectedUserId: string): Promise<HousingResult> {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0
    || !(HOUSING_WALLPAPERS as readonly string[]).includes(input.wallpaper)
    || !(HOUSING_FLOORS as readonly string[]).includes(input.floor)
    || !Array.isArray(input.placements) || input.placements.length > 36
    || input.placements.some((placement) => !placement || typeof placement.inventoryId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(placement.inventoryId)
      || ![placement.x, placement.y, placement.rotation].every(Number.isInteger)
      || placement.x < 0 || placement.x > 5 || placement.y < 0 || placement.y > 5
      || placement.rotation < 0 || placement.rotation > 3
      || (placement.surface !== undefined && !HOUSING_SURFACES.includes(placement.surface))
      || (placement.surface !== undefined && placement.surface !== "floor" && (placement.y > 3 || placement.rotation !== 0)))) {
    return { ok: false, error: "가구의 위치와 회전을 확인해 주세요." };
  }
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };
    if (user.id !== expectedUserId) return { ok: false, error: "로그인한 계정이 변경되었습니다. 프로필을 다시 열어 주세요." };
    const { data, error } = await client.rpc("save_my_housing_room", {
      p_revision: input.revision,
      p_wallpaper: input.wallpaper,
      p_floor: input.floor,
      p_placements: input.placements,
    });
    const result = housingRpcResult(data, error);
    if (result.ok) revalidatePath("/profile");
    return result;
  } catch {
    return { ok: false, error: "방을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
