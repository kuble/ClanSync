/**
 * `.env` / `.env.local` 한 줄 파서 (npm `dotenv`와 달리 값 안의 `#`를 주석으로 보지 않음).
 * 비밀번호에 `#`가 들어가도 따옴표 없이 한 줄로 쓸 수 있음.
 */
import { readFileSync, existsSync } from "node:fs";

export function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const o = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    o[k] = v;
  }
  return o;
}
