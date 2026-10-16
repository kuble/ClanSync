"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { EVENT_DISCORD_SLOTS, type EventDiscordSettings } from "@/lib/clan/event-discord-settings";

export function EventDiscordFields({ available, channelName, value, settingsHref }: { available: boolean; channelName?: string | null; value?: EventDiscordSettings; settingsHref: string }) {
  const [enabled, setEnabled] = useState(value?.enabled ?? available);
  const detailsId = useId();
  return <section className="space-y-3 rounded-xl border bg-muted/20 p-4" aria-label="일정 Discord 알림">
    {available && <input type="hidden" name="discord_notify_present" value="true" />}
    <label className="flex items-center justify-between gap-3 text-sm font-medium">Discord 알림<Switch name="event_discord_enabled" aria-controls={detailsId} checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!available} /></label>
    {!available && <p className="text-xs text-muted-foreground">연결과 알림 종류는 <Link href={settingsHref} className="underline underline-offset-4">클랜 설정의 알림·연동</Link>에서 관리합니다.</p>}
    <fieldset id={detailsId} hidden={!available || !enabled} disabled={!available || !enabled} className="ml-3 space-y-3 border-l-2 border-primary/25 pl-3 disabled:opacity-50">
      {available && <p className="text-xs text-muted-foreground">{channelName ? `#${channelName}` : "설정한 일정 알림"} 채널로 알립니다.</p>}
      <label className="flex items-center justify-between gap-3 text-xs">등록·변경 시<Switch name="event_discord_announce" defaultChecked={value?.announce ?? true} /></label>
      <div className="space-y-3">{EVENT_DISCORD_SLOTS.map(({ id, label }) => <label key={id} className="flex items-center justify-between gap-3 text-xs">{label}<Switch name="event_discord_slots" value={id} defaultChecked={value?.slots.includes(id) ?? id === "event_t_minus_1h"} /></label>)}</div>
    </fieldset>
  </section>;
}
