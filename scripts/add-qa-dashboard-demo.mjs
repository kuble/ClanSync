import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./test-env.mjs";

// Add presentation content only to the named QA clan. Never reseed accounts or matches.
const clanId = "73441bc9-2ffd-4789-8da4-f50423073706";
const env = loadTestEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const apply = process.argv.includes("--apply");
assert(process.argv.slice(2).every((arg) => arg === "--apply"));
async function checked(query) {
  const { data, error } = await query;
  assert.equal(error, null, error?.message);
  return data;
}
function id(key) {
  const h = createHash("sha256").update(`clansync:qa-dashboard-demo:v1:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const clan = await checked(db.from("clans").select("name,rules").eq("id", clanId).single());
assert.equal(clan.name, "QA_01_Clan");
const leader = await checked(db.from("clan_members").select("user_id,users(nickname)")
  .eq("clan_id", clanId).eq("role", "leader").eq("status", "active").single());
assert.equal(leader.users.nickname, "QA_Leader_01");
const now = new Date();
const notices = [
  {
    title: "이번 주 정기 내전 · 토요일 밤 9시",
    content: "이번 주도 함께 모여 즐겁게 내전해요!\n\n토요일 21:00 시작, 20:50까지 음성 채널에 모여 주세요.\n참가 여부와 선호 역할을 미리 등록하면 팀 편성이 더 수월해집니다.\n첫 경기는 가볍게 몸풀기, 이후에는 다양한 팀 조합으로 진행합니다.",
    is_pinned: true,
  },
  {
    title: "새로 오신 클랜원 여러분, 환영합니다",
    content: "반가워요! 우리 클랜은 실력보다 함께 즐기는 마음을 먼저 생각합니다.\n\n프로필에 주로 플레이하는 역할과 영웅을 등록해 주세요.\n내전이 처음이라도 편하게 참가해 주세요. 운영진이 진행 방법을 안내해 드립니다.\n서로 이름을 불러주고, 좋은 플레이에는 아낌없이 칭찬해요.",
    is_pinned: false,
  },
  {
    title: "지난달 우리 클랜의 MVP를 만나보세요",
    content: "지난달 내전에서 멋진 활약을 보여준 클랜원들에게 박수를 보내 주세요!\n\n승률 MVP, 꾸준히 함께한 참여율 MVP, 경기를 읽는 승부예측 MVP를 대시보드에서 확인할 수 있습니다.\n더 자세한 역할별 전적과 듀오 궁합은 클랜 통계에서 확인해 보세요.\n이번 달에도 함께 좋은 기록을 만들어 가요.",
    is_pinned: false,
  },
].map((row, i) => ({ ...row, id: id(`notice:${i}`), clan_id: clanId,
  created_by: leader.user_id, updated_by: leader.user_id,
  created_at: new Date(now.getTime() - i * 86_400_000).toISOString() }));
function nextWeekday(weekday, hour) {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  let at = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), hour - 9);
  at += ((weekday - kst.getUTCDay() + 7) % 7) * 86_400_000;
  if (at <= now.getTime()) at += 7 * 86_400_000;
  return new Date(at).toISOString();
}
const events = [
  { title: "수요 듀오 연습회", kind: "event", weekday: 3, hour: 20, place: "디스코드 · 자유 플레이 채널" },
  { title: "토요 정기 내전", kind: "intra", weekday: 6, hour: 21, place: "디스코드 · 내전 채널" },
  { title: "일요일 리플레이 함께 보기", kind: "event", weekday: 7, hour: 20, place: "디스코드 · 리플레이 채널" },
].map(({ weekday, hour, ...row }, i) => ({ ...row, id: id(`event:${i}`),
  clan_id: clanId, created_by: leader.user_id, source: "manual", repeat: "weekly",
  start_at: nextWeekday(weekday % 7, hour), repeat_weekdays: [weekday],
  repeat_time: `${hour}:00:00` }));
const rules = "1. 서로 존중하고, 좋은 플레이에는 칭찬을 건네 주세요.\n2. 내전 시작 10분 전까지 참가 여부와 선호 역할을 확인해 주세요.\n3. 팀 편성과 경기 결과는 운영진 안내에 따라 진행합니다.\n4. 실수에 대한 비난과 과도한 훈수는 삼가 주세요.\n5. 함께 즐기는 것이 우선! 불편한 점은 운영진에게 편하게 알려 주세요.";
const oldNotices = await checked(db.from("clan_notices").select("id").in("id", notices.map((r) => r.id)));
const oldEvents = await checked(db.from("clan_events").select("id").in("id", events.map((r) => r.id)));
const missingNotices = notices.filter((r) => !oldNotices.some((old) => old.id === r.id));
const missingEvents = events.filter((r) => !oldEvents.some((old) => old.id === r.id));
console.log(JSON.stringify({ mode: apply ? "apply" : "preview", clan: clan.name,
  newNotices: missingNotices.length, newEvents: missingEvents.length, fillRules: !clan.rules?.trim() }));
if (apply) {
  if (missingNotices.length) await checked(db.from("clan_notices").insert(missingNotices));
  if (missingEvents.length) await checked(db.from("clan_events").insert(missingEvents));
  if (!clan.rules?.trim()) {
    const update = db.from("clans").update({ rules }).eq("id", clanId);
    await checked(clan.rules === null ? update.is("rules", null) : update.eq("rules", clan.rules));
  }
  const saved = await checked(db.from("clans").select("rules").eq("id", clanId).single());
  assert(saved.rules?.trim(), "Dashboard rules must be present after applying content");
  console.log("QA dashboard content verified. Existing records, members and coins were not modified.");
}
