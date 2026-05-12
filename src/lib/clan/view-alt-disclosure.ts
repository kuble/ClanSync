/**
 * 프로필 부계동 카드 노출 안내 문구용 — hasClanPermission 과 동형의 roles 배열.
 */
import { CLAN_PERMISSION_DEFAULTS } from "@/lib/clan/permission-defaults";

export type ViewAltAudience = "members_too" | "officers_only";

export function effectiveViewAltAccountRoles(
  permissionsUnknown: Record<string, unknown> | null | undefined,
): readonly string[] {
  const key = "view_alt_accounts";
  const raw = permissionsUnknown?.[key];
  let allowed: readonly string[];

  if (Array.isArray(raw)) {
    const xs = raw.filter((x): x is string => typeof x === "string");
    allowed = xs.length > 0 ? xs : [...CLAN_PERMISSION_DEFAULTS[key]];
  } else {
    allowed = CLAN_PERMISSION_DEFAULTS[key];
  }

  return allowed;
}

/** 리더·운영진만 vs 같은 클랜 멤버까지 */
export function viewAltAudience(roles: readonly string[]): ViewAltAudience {
  if (roles.includes("member")) return "members_too";
  return "officers_only";
}

export function viewAltAudienceCaption(audience: ViewAltAudience): string {
  if (audience === "members_too") {
    return "같은 클랜의 구성원(멤버)까지 열람 가능한 설정입니다.";
  }
  return "리더·운영진만 열람 가능한 설정입니다.";
}
