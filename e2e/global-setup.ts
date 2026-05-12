import { spawnSync } from "node:child_process";

/**
 * 픽스처·Premium 후처리 포함 `db:seed` 를 E2E 시작 전 한 번 실행해
 * QA 클랜 플랜·멤버십 상태를 테스트와 정합시킵니다.
 * 생략: `E2E_SKIP_SEED=1`
 */
async function globalSetup(): Promise<void> {
  if (process.env.E2E_SKIP_SEED === "1") return;

  const r = spawnSync("npm run db:seed", {
    cwd: process.cwd(),
    shell: true,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(`db:seed exited with ${r.status ?? "unknown"}`);
  }
}

export default globalSetup;
