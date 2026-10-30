"use client";

import { ClanNotificationList } from "@/components/main-clan/clan-notification-list";

export function NotificationExample() {
  return <div inert className="[&>ul]:max-h-none [&>ul]:overflow-visible">
    <ClanNotificationList eventsBase="/dev/landing-preview" now={Date.parse("2026-10-30T21:00:00+09:00")} items={[
      { id: "example-event", kind: "event_reminder", created_at: "2026-10-30T20:50:00+09:00", read_at: null, payload: { event_title: "금요일 정기 내전", slot_kind: "event_t_minus_10min" } },
      { id: "example-poll", kind: "poll_reminder", created_at: "2026-10-30T20:00:00+09:00", read_at: null, payload: { poll_title: "다음 모임, 언제가 좋을까요?", slot_kind: "poll_deadline_1h" } },
      { id: "example-coaching", kind: "coaching_comment", created_at: "2026-10-30T19:00:00+09:00", read_at: "2026-10-30T19:30:00+09:00", payload: { post_title: "지난 경기 리플레이 피드백" } },
    ]} />
  </div>;
}
