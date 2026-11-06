import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadSharedQaEnv as loadTestEnv } from "../../test-env.mjs";
import { QA_CLAN_ACCOUNT_EMAILS } from "../../fixtures/qa-fixtures.mjs";

const apply = process.argv.includes("--apply");
assert(process.argv.slice(2).every(arg => arg === "--apply"), "Use no arguments (preview) or --apply.");
const env = loadTestEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const clanId = "73441bc9-2ffd-4789-8da4-f50423073706";
async function checked(query) { const { data, error } = await query; if (error) throw new Error(error.message); return data; }
const clan = await checked(db.from("clans").select("name,game_id").eq("id", clanId).single());
assert.equal(clan.name, "QA_01_Clan");
assert.equal((await checked(db.from("games").select("slug").eq("id", clan.game_id).single())).slug, "overwatch");
const members = await checked(db.from("clan_members").select("user_id").eq("clan_id", clanId).eq("status", "active"));
const users = await checked(db.from("users").select("id,email").in("id", members.map(member => member.user_id)).order("email"));
assert.deepEqual(users.map(user => user.email.toLowerCase()), QA_CLAN_ACCOUNT_EMAILS);
const before = await checked(db.from("clan_board_coaches").select("*").eq("clan_id", clanId).order("user_id"));
const existing = new Set(before.map(coach => coach.user_id));
const examples = [
  ["돌격 · 라인하르트 · 공간 만들기", "방벽을 세우는 위치부터 진입 타이밍까지 함께 살펴봅니다.\n리플레이의 첫 한타와 패배한 한타를 비교하며 팀이 움직일 공간을 만드는 방법을 정리합니다."],
  ["공격 · 캐서디 · 에임과 포지셔닝", "중거리 교전에서 안전하게 피해를 누적하는 위치를 확인합니다.\n조준 습관, 엄폐물 활용, 궁극기 타이밍을 한 장면씩 짚어 드립니다."],
  ["지원 · 아나 · 생존과 스킬 배분", "힐과 공격의 균형, 수면총과 생체 수류탄의 사용 기준을 함께 정리합니다.\n다음 경기에서 바로 연습할 수 있도록 핵심 과제 세 가지를 제안합니다."],
  ["돌격 · 윈스턴 · 다이브 운영", "진입 전에 확인할 팀원 위치와 점프팩 복귀 경로를 살펴봅니다.\n상대 지원가를 압박하는 타이밍, 방벽으로 시야를 나누는 방법을 다룹니다."],
  ["공격 · 트레이서 · 측면 운영", "교전 전 준비 위치와 점멸·역행 관리에 집중합니다.\n팀의 진입과 측면 압박을 맞추는 장면을 찾아 더 좋은 선택을 함께 생각합니다."],
  ["지원 · 키리코 · 팀 케어", "정화의 방울과 순보를 아끼거나 사용해야 하는 상황을 비교합니다.\n아군을 살리면서도 압박을 이어 가는 동선과 궁극기 연계를 확인합니다."],
];
const rows = users.slice(1, examples.length + 1).map((user, index) => ({ clan_id: clanId, user_id: user.id, expertise: examples[index][0], bio: examples[index][1], accepting: index !== examples.length - 1 })).filter(coach => !existing.has(coach.user_id));
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", clan: clan.name, existing: before.length, adding: rows.length }));
if (apply && rows.length) {
  await checked(db.from("clan_board_coaches").insert(rows));
  const after = await checked(db.from("clan_board_coaches").select("*").eq("clan_id", clanId).order("user_id"));
  assert.deepEqual(after.filter(coach => existing.has(coach.user_id)), before, "Existing coach profiles must stay unchanged.");
  assert.equal(after.length, before.length + rows.length);
  console.log(JSON.stringify({ verified: true, totalCoaches: after.length }));
}
