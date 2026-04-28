"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hasClanPermission } from "@/lib/clan/has-clan-permission";
import { buildPollNotificationSlots } from "@/lib/clan/poll-notification-schedule";
import {
  parsePollNotifyRepeat,
  validatePollNotifyAgainstDeadline,
  type PollNotifyRepeat,
} from "@/lib/clan/poll-notify-validation";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export type ClanPollMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createClanPollAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<ClanPollMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!allowed) return { ok: false, error: "투표를 만들 권한이 없습니다." };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 1 || title.length > 120) {
    return { ok: false, error: "제목은 1~120자입니다." };
  }

  const rawOpts = formData.getAll("option_label").map((x) => String(x).trim());
  const labels = rawOpts.filter((s) => s.length > 0);
  if (labels.length < 2 || labels.length > 12) {
    return { ok: false, error: "선택지는 2~12개입니다." };
  }
  const unique = new Set(labels);
  if (unique.size !== labels.length) {
    return { ok: false, error: "선택지 내용이 중복되었습니다." };
  }

  const deadlineLocal = String(formData.get("deadline_local") ?? "").trim();
  if (!deadlineLocal) {
    return { ok: false, error: "마감 일시를 입력해 주세요." };
  }
  const deadlineAt = new Date(deadlineLocal);
  if (Number.isNaN(deadlineAt.getTime())) {
    return { ok: false, error: "마감 일시가 올바르지 않습니다." };
  }
  const createdFloor = new Date();
  if (deadlineAt.getTime() <= createdFloor.getTime()) {
    return { ok: false, error: "마감은 현재 시각 이후여야 합니다." };
  }

  const anonymous = formData.get("anonymous") === "on";
  const multipleChoice = formData.get("multiple_choice") === "on";

  const pollNotifyEnabled = formData.get("poll_notify_enabled") === "on";
  const notifyHourRaw = parseInt(
    String(formData.get("notify_hour") ?? "9"),
    10,
  );
  const notifyHour = Number.isFinite(notifyHourRaw)
    ? Math.min(23, Math.max(0, notifyHourRaw))
    : 9;
  let notifyRepeat: PollNotifyRepeat = parsePollNotifyRepeat(
    String(formData.get("notify_repeat") ?? "none"),
  );
  if (!pollNotifyEnabled) {
    notifyRepeat = "none";
  }

  const nowMs = Date.now();
  const deadlineMs = deadlineAt.getTime();
  const nv = validatePollNotifyAgainstDeadline(nowMs, deadlineMs, notifyRepeat);
  if (!nv.ok) {
    return { ok: false, error: nv.error };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();

  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: pollRow, error: insPollErr } = await svc
    .from("clan_polls")
    .insert({
      clan_id: clanId,
      title,
      anonymous,
      multiple_choice: multipleChoice,
      deadline_at: deadlineAt.toISOString(),
      notify_repeat: notifyRepeat,
      notify_hour: notifyHour,
      post_to_notice: false,
      created_by: user.id,
    })
    .select("id, created_at")
    .single();

  if (insPollErr || !pollRow?.id) {
    return { ok: false, error: insPollErr?.message ?? "저장에 실패했습니다." };
  }

  const pollId = pollRow.id as string;
  const createdAt = new Date(pollRow.created_at as string);

  const optionPayload = labels.map((label, i) => ({
    poll_id: pollId,
    label: label.slice(0, 80),
    sort_order: i,
  }));

  const { error: optErr } = await svc.from("poll_options").insert(optionPayload);

  if (optErr) {
    await svc.from("clan_polls").delete().eq("id", pollId);
    return { ok: false, error: optErr.message };
  }

  if (notifyRepeat !== "none") {
    const slots = buildPollNotificationSlots(
      createdAt,
      deadlineAt,
      notifyRepeat,
      notifyHour,
    );
    const { data: memRows, error: memErr } = await svc
      .from("clan_members")
      .select("user_id")
      .eq("clan_id", clanId)
      .eq("status", "active");

    if (memErr) {
      await svc.from("clan_polls").delete().eq("id", pollId);
      return { ok: false, error: memErr.message };
    }

    const userIds = (memRows ?? []).map((r) => r.user_id as string);
    const logRows: {
      poll_id: string;
      slot_kind: string;
      channel: "inapp";
      recipient_user_id: string;
      scheduled_at: string;
      dedup_key: string;
      status: "scheduled";
    }[] = [];

    for (const uid of userIds) {
      for (const s of slots) {
        const scheduledAt = s.scheduled_at.toISOString();
        const dedup_key = createHash("sha256")
          .update(
            `${pollId}|${s.slot_kind}|${scheduledAt}|${uid}|inapp`,
          )
          .digest("hex");
        logRows.push({
          poll_id: pollId,
          slot_kind: s.slot_kind,
          channel: "inapp",
          recipient_user_id: uid,
          scheduled_at: scheduledAt,
          dedup_key,
          status: "scheduled",
        });
      }
    }

    const chunk = 400;
    for (let i = 0; i < logRows.length; i += chunk) {
      const slice = logRows.slice(i, i + chunk);
      const { error: logErr } = await svc.from("notification_log").insert(slice);
      if (logErr) {
        await svc.from("clan_polls").delete().eq("id", pollId);
        return { ok: false, error: logErr.message };
      }
    }
  }

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}

export async function voteClanPollAction(
  gameSlug: string,
  clanId: string,
  formData: FormData,
): Promise<ClanPollMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: memRows } = await supabase.rpc("select_my_clan_membership", {
    p_clan_id: clanId,
  });
  const mem = memRows?.[0];
  if (!mem || mem.status !== "active") {
    return { ok: false, error: "클랜 구성원만 투표할 수 있습니다." };
  }

  const pollId = String(formData.get("poll_id") ?? "").trim();
  if (!pollId) return { ok: false, error: "투표를 찾을 수 없습니다." };

  const picked = formData.getAll("option_id").map((x) => String(x).trim());
  const optionIds = [...new Set(picked)].filter(Boolean);
  if (optionIds.length === 0) {
    return { ok: false, error: "선택지를 골라 주세요." };
  }

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();

  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { data: poll, error: pollErr } = await svc
    .from("clan_polls")
    .select("id, clan_id, deadline_at, closed_at, multiple_choice")
    .eq("id", pollId)
    .maybeSingle();

  if (pollErr || !poll || poll.clan_id !== clanId) {
    return { ok: false, error: "투표를 찾을 수 없습니다." };
  }
  if (poll.closed_at != null) {
    return { ok: false, error: "종료된 투표입니다." };
  }
  if (new Date(poll.deadline_at as string).getTime() <= Date.now()) {
    return { ok: false, error: "마감된 투표입니다." };
  }

  if (!(poll.multiple_choice as boolean) && optionIds.length !== 1) {
    return { ok: false, error: "한 가지 선택지만 고를 수 있습니다." };
  }

  const { data: validOpts } = await svc
    .from("poll_options")
    .select("id")
    .eq("poll_id", pollId)
    .in("id", optionIds);

  const validIds = new Set((validOpts ?? []).map((r) => r.id as string));
  for (const oid of optionIds) {
    if (!validIds.has(oid)) {
      return { ok: false, error: "선택지가 올바르지 않습니다." };
    }
  }

  for (const optionId of optionIds) {
    const { error: vErr } = await svc.from("poll_votes").insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: user.id,
    });
    if (vErr) return { ok: false, error: vErr.message };
  }

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}

export async function closeClanPollAction(
  gameSlug: string,
  clanId: string,
  pollId: string,
): Promise<ClanPollMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const allowed = await hasClanPermission(
    supabase,
    user.id,
    clanId,
    "manage_clan_events",
  );
  if (!allowed) return { ok: false, error: "투표를 종료할 권한이 없습니다." };

  const svc = createServiceRoleClient();
  const { data: clanRow } = await svc
    .from("clans")
    .select("id, games!inner(slug)")
    .eq("id", clanId)
    .maybeSingle();

  const g = clanRow?.games as unknown as { slug: string } | undefined;
  if (!clanRow || g?.slug !== gameSlug) {
    return { ok: false, error: "클랜을 찾을 수 없습니다." };
  }

  const { error } = await svc
    .from("clan_polls")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", pollId)
    .eq("clan_id", clanId)
    .is("closed_at", null);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/games/${gameSlug}/clan/${clanId}/events`);
  return { ok: true };
}
