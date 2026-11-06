export function executionPlan(mode, args, env = process.env) {
  if (!["db", "e2e"].includes(mode)) throw new Error("검사 종류는 db 또는 e2e여야 합니다.");
  const requested = args.filter(arg => !arg.startsWith("--"));
  for (const arg of args.filter(arg => arg.startsWith("--"))) {
    if (mode !== "e2e" || !["--production", "--trace"].includes(arg))
      throw new Error(`지원하지 않는 검사 옵션 ${arg}`);
  }
  // Full regression and CI always build, even when a legacy dev override is set.
  const production = mode === "e2e" && (!requested.length || !!env.CI || args.includes("--production") || env.LOCAL_TEST_DEV_SERVER === "0");
  return { requested, production, trace: mode === "e2e" && (production || args.includes("--trace")) ? "retain-on-failure" : "off" };
}

export function formatSummary(run) {
  const { counts } = run;
  const lines = [`검사 ${run.status === "pass" ? "통과" : "실패"}: 통과 ${counts.pass} · 실패 ${counts.fail} · 건너뜀 ${counts.skip} · 미완료 ${counts.start}`];
  const failures = run.tests.filter(test => test.status === "fail");
  for (const test of failures.slice(0, 5))
    lines.push(`${test.file}:${test.line} ${test.title}\n${(test.error || "상세 로그 확인 필요").slice(0, 1500)}`);
  if (failures.length > 5) lines.push(`그 외 실패 ${failures.length - 5}개는 상세 로그에서 확인합니다.`);
  for (const error of run.errors.slice(0, 3)) lines.push(error.slice(0, 1500));
  lines.push(`검사 후 데이터 정리: ${run.cleanup?.status === "pass" ? "완료" : "미완료"}`);
  if (run.cleanup?.error) lines.push(run.cleanup.error.slice(0, 1500));
  return lines.join("\n");
}
