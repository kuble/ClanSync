import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HousingResult, HousingState } from "./types";

const ERROR_MESSAGES: Record<string, string> = {
  housing_auth_required: "로그인이 필요합니다.",
  housing_item_not_found: "구매할 수 없는 가구입니다.",
  housing_insufficient_coins: "개인 코인이 부족합니다.",
  housing_invalid_layout: "가구의 위치와 회전을 확인해 주세요.",
  housing_item_not_owned: "보유한 가구만 배치할 수 있습니다.",
  housing_overlap: "가구가 겹치지 않도록 배치해 주세요.",
  housing_out_of_bounds: "가구가 방 안에 들어오도록 배치해 주세요.",
  housing_invalid_surface: "벽 가구는 벽에, 바닥 가구는 바닥에 배치해 주세요.",
  housing_stale_revision: "다른 탭에서 방이 변경되었습니다. 새로 불러온 뒤 다시 꾸며 주세요.",
};

export function housingErrorMessage(error: { message?: string; code?: string } | null): string {
  if (error?.code === "42501") return "로그인이 필요합니다.";
  return ERROR_MESSAGES[error?.message ?? ""] ?? "방 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function housingRpcResult(data: unknown, error: { message?: string; code?: string } | null): HousingResult {
  if (error) return { ok: false, error: housingErrorMessage(error) };
  if (!data || typeof data !== "object" || !Array.isArray((data as HousingState).catalog)
    || !Array.isArray((data as HousingState).inventory) || !(data as HousingState).room
    || !Number.isInteger((data as HousingState).room.revision) || !Number.isInteger((data as HousingState).coinBalance)) {
    return { ok: false, error: "방 정보를 불러오지 못했습니다. 다시 시도해 주세요." };
  }
  const state = data as HousingState;
  return { ok: true, state: {
    ...state,
    catalog: state.catalog.map((item) => ({ ...item, mount: item.mount ?? "floor", wallLayer: item.wallLayer ?? null })),
    inventory: state.inventory.map((item) => ({ ...item, surface: item.surface ?? "floor" })),
  } };
}

export async function loadHousingState(): Promise<HousingResult> {
  try {
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };
    const { data, error } = await client.rpc("get_my_housing");
    return housingRpcResult(data, error);
  } catch {
    return { ok: false, error: "방 정보를 불러오지 못했습니다. 다시 시도해 주세요." };
  }
}
