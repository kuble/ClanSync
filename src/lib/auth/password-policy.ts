/**
 * D-AUTH-03 — strong 비밀번호 (영+숫+특, 8~72자)
 */
export const PASSWORD_STRONG_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d\S]{8,72}$/;

export function isStrongPassword(password: string): boolean {
  return PASSWORD_STRONG_REGEX.test(password);
}

export function passwordPolicyHint(): string {
  return "영문·숫자·특수문자를 각각 포함하고, 8~72자로 입력해 주세요.";
}
