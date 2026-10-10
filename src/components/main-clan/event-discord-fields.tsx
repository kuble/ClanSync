"use client";

import { useState } from "react";
import { EVENT_DISCORD_SLOTS, type EventDiscordSettings } from "@/lib/clan/event-discord-settings";

export function EventDiscordFields({ available, channelName, value }: { available: boolean; channelName?: string | null; value?: EventDiscordSettings }) {
  const [enabled, setEnabled] = useState(value?.enabled ?? false);
  return <section className="space-y-3 rounded-xl border bg-muted/20 p-3" aria-label="일정 Discord 알림">
    {available && <input type="hidden" name="discord_notify_present" value="true" />}
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="event_discord_enabled" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!available} className="size-4 accent-primary" />Discord 알림</label>
    {!available && <p className="text-xs text-muted-foreground">알림 설정에서 공용 봇과 채널을 먼저 연결해 주세요.</p>}
    {available && <p className="text-xs text-muted-foreground">#{channelName} 채널로 알립니다.</p>}
    <fieldset disabled={!available || !enabled} className="space-y-3 disabled:opacity-50">
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="event_discord_announce" defaultChecked={value?.announce ?? true} className="size-4 accent-primary" />등록·변경 시</label>
      <div className="flex flex-wrap gap-x-4 gap-y-2">{EVENT_DISCORD_SLOTS.map(({ id, label }) => <label key={id} className="flex items-center gap-2 text-xs"><input type="checkbox" name="event_discord_slots" value={id} defaultChecked={value?.slots.includes(id) ?? id === "event_t_minus_1h"} className="size-4 accent-primary" />{label}</label>)}</div>
    </fieldset>
  </section>;
}
