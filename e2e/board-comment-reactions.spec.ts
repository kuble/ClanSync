import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { loadTestEnv } from "../scripts/test-env.mjs";
import type { Database } from "../src/lib/supabase/database.types";
import { createIsolatedBalanceFixture } from "./isolated-balance-fixture";

async function ok<T>(query: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await query;
  expect(error, JSON.stringify(error)).toBeNull();
  return data as NonNullable<T>;
}

test("board standard comment reactions: no emoji purchase, replace/cancel, RLS and cascade", async () => {
  test.setTimeout(120_000);
  const f = await createIsolatedBalanceFixture(3);
  let otherClan: string | undefined;
  try {
    const [leader, member, outsider] = await Promise.all([f.memberClient(0), f.memberClient(1), f.memberClient(2)]);
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[2].id));
    const post = await ok(f.service.from("clan_board_posts").insert({ clan_id: f.clanId, author_id: f.users[0].id, kind: "free", title: "기본 공감 검사", content: "슬롯 구매 없이 공감합니다." }).select("id").single());
    const comment = await ok(f.service.from("clan_board_comments").insert({ post_id: post.id, author_id: f.users[0].id, content: "공감 종류와 권한을 확인합니다." }).select("id").single());
    expect(await ok(f.service.from("purchases").select("id").eq("clan_id", f.clanId))).toEqual([]);
    const list = () => ok(member.rpc("list_board_comment_reactions", { p_comment_ids: [comment.id] }));
    await ok(member.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "like" }));
    await ok(member.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "like" }));
    expect(await list()).toEqual([{ comment_id: comment.id, kind: "like", total: 1, mine: true }]);
    await ok(leader.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "heart" }));
    await ok(member.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "heart" }));
    expect(await list()).toEqual([{ comment_id: comment.id, kind: "heart", total: 2, mine: true }]);
    expect(await ok(member.from("clan_board_comment_reactions").select("kind").eq("comment_id", comment.id).eq("user_id", f.users[1].id))).toEqual([{ kind: "heart" }]);
    expect((await member.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "unknown" })).error?.code).toBe("23514");
    expect((await member.from("clan_board_comment_reactions").insert({ comment_id: comment.id, kind: "like", user_id: f.users[0].id })).error).not.toBeNull();
    expect((await member.from("clan_board_comment_reactions").update({ user_id: f.users[0].id }).eq("comment_id", comment.id)).error).not.toBeNull();
    expect(await ok(member.from("clan_board_comment_reactions").update({ kind: "sad" }).eq("comment_id", comment.id).eq("user_id", f.users[0].id).select())).toEqual([]);
    expect(await ok(member.from("clan_board_comment_reactions").delete().eq("comment_id", comment.id).eq("user_id", f.users[0].id).select())).toEqual([]);
    await ok(member.rpc("set_board_comment_reaction", { p_comment_id: comment.id }));
    await ok(member.rpc("set_board_comment_reaction", { p_comment_id: comment.id }));
    expect(await list()).toEqual([{ comment_id: comment.id, kind: "heart", total: 1, mine: false }]);
    expect(await ok(member.rpc("list_board_comment_reactions", { p_comment_ids: [] }))).toEqual([]);
    expect(await ok(member.rpc("list_board_comment_reactions", { p_comment_ids: Array(51).fill(comment.id) }))).toEqual([]);

    otherClan = (await ok(f.service.from("clans").insert({ game_id: f.gameId, name: `Reaction-${f.clanId.slice(0, 8)}` }).select("id").single())).id;
    await ok(f.service.from("clan_members").insert({ clan_id: otherClan, user_id: f.users[2].id, role: "leader", status: "active" }));
    const otherPost = await ok(f.service.from("clan_board_posts").insert({ clan_id: otherClan, author_id: f.users[2].id, kind: "free", title: "다른 클랜", content: "격리 검사" }).select("id").single());
    const otherComment = await ok(f.service.from("clan_board_comments").insert({ post_id: otherPost.id, author_id: f.users[2].id, content: "다른 클랜 댓글" }).select("id").single());
    await ok(outsider.rpc("set_board_comment_reaction", { p_comment_id: otherComment.id, p_kind: "clap" }));
    expect(await ok(outsider.rpc("list_board_comment_reactions", { p_comment_ids: [comment.id, otherComment.id] }))).toEqual([{ comment_id: otherComment.id, kind: "clap", total: 1, mine: true }]);
    expect(await ok(member.rpc("list_board_comment_reactions", { p_comment_ids: [otherComment.id] }))).toEqual([]);
    expect((await member.rpc("set_board_comment_reaction", { p_comment_id: otherComment.id, p_kind: "like" })).error).not.toBeNull();
    expect((await outsider.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "like" })).error).not.toBeNull();
    expect(await ok(outsider.from("clan_board_comment_reactions").select().eq("comment_id", comment.id))).toEqual([]);
    expect((await outsider.from("clan_board_comment_reactions").insert({ comment_id: comment.id, kind: "like" })).error).not.toBeNull();
    const env = loadTestEnv();
    const anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    expect((await anon.from("clan_board_comment_reactions").select()).error).not.toBeNull();
    expect((await anon.rpc("list_board_comment_reactions", { p_comment_ids: [comment.id] })).error).not.toBeNull();
    expect((await anon.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "like" })).error).not.toBeNull();
    await ok(member.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "laugh" }));
    await ok(f.service.from("clan_members").update({ status: "left" }).eq("clan_id", f.clanId).eq("user_id", f.users[1].id));
    expect(await list()).toEqual([]);
    expect((await member.rpc("set_board_comment_reaction", { p_comment_id: comment.id, p_kind: "sad" })).error).not.toBeNull();
    expect((await member.from("clan_board_comment_reactions").insert({ comment_id: comment.id, kind: "sad" })).error).not.toBeNull();
    await ok(leader.from("clan_board_comments").delete().eq("id", comment.id));
    expect(await ok(f.service.from("clan_board_comment_reactions").select().eq("comment_id", comment.id))).toEqual([]);
  } finally {
    try { if (otherClan) await ok(f.service.from("clans").delete().eq("id", otherClan)); }
    finally { await f.cleanup(); }
  }
});
