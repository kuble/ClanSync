"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, SlidersHorizontal } from "lucide-react";
import { listClanDiscordChannelsAction, updateClanEventNotifyAction } from "@/app/actions/clan-event-notify";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export type EventNotifyConnection = { guild_name: string; channel_id: string | null; channel_name: string | null };
type Props = {
  gameSlug: string; clanId: string; discordEnabled: boolean; kakaoNotificationsOptIn: boolean;
  canEdit: boolean; premium: boolean; botConfigured: boolean; connection: EventNotifyConnection | null;
  connectionResult?: string;
};

export function ClanEventNotificationSettings(props: Props) {
  const [open, setOpen] = useState(props.connectionResult === "connected" || props.connectionResult === "failed");
  return <>
    <Button variant="ghost" size="icon-sm" aria-label="알림 설정" title="알림 설정" onClick={() => setOpen(true)}><SlidersHorizontal className="size-4" /></Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex flex-col">
        <SheetHeader><SheetTitle>알림 설정</SheetTitle><SheetDescription>Discord 서버를 연결하고 알림을 받을 채널을 선택하세요.</SheetDescription></SheetHeader>
        {open && <div className="min-h-0 flex-1 overflow-y-auto p-4"><ClanEventNotifyForm {...props} onSaved={() => setOpen(false)} /></div>}
      </SheetContent>
    </Sheet>
  </>;
}

function ClanEventNotifyForm({ gameSlug, clanId, discordEnabled, kakaoNotificationsOptIn, canEdit, premium, botConfigured, connection, connectionResult, onSaved }: Props & { onSaved: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(canEdit && premium && !!connection && botConfigured);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [channelId, setChannelId] = useState(connection?.channel_id ?? "");
  const [enabled, setEnabled] = useState(discordEnabled);
  useEffect(() => {
    if (!canEdit || !premium || !connection || !botConfigured) return;
    let active = true;
    void listClanDiscordChannelsAction(gameSlug, clanId).then((result) => {
      if (!active) return;
      if (result.ok) setChannels(result.channels);
      else { setChannels([]); setLoadError(result.error); }
    }).catch(() => { if (active) { setChannels([]); setLoadError("채널을 불러오지 못했습니다."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gameSlug, clanId, canEdit, premium, connection, botConfigured, refresh]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    // A disabled select does not submit; preserve the verified selection on fetch failure.
    form.set("discord_channel_id", channelId);
    form.set("discord_enabled", enabled ? "on" : "off");
    start(async () => {
      const result = await updateClanEventNotifyAction(gameSlug, clanId, form);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("알림 설정을 저장했습니다."); onSaved(); router.refresh();
    });
  }
  return <div className="space-y-4" data-testid="clan-event-notify-settings">
    {connectionResult === "failed" && <p role="alert" className="text-sm text-destructive">Discord 연결을 완료하지 못했습니다. 서버 관리 권한과 봇 초대를 확인해 주세요.</p>}
    {!premium && <p className="text-sm text-muted-foreground">Discord 알림은 Premium 클랜에서 사용할 수 있습니다.</p>}
    {!canEdit && <p className="text-sm text-muted-foreground">연결과 저장은 클랜장만 할 수 있습니다.</p>}
    <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Discord</h3>
      {connection && <p className="text-sm">{connection.guild_name}</p>}
      {!botConfigured && <p className="text-xs text-muted-foreground">공용 봇 연결을 준비 중입니다.</p>}
      {canEdit && premium && (botConfigured ? <Button variant="outline" size="sm" render={<a href={`/api/discord/connect?clanId=${encodeURIComponent(clanId)}`} />}><Plus className="size-4" />{connection ? "서버 다시 연결" : "Discord 알림 추가"}</Button> : <Button variant="outline" size="sm" disabled><Plus className="size-4" />Discord 알림 추가</Button>)}
    </section>
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset disabled={!canEdit || !premium || pending} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="discord-channel" className="text-sm font-medium">알림 채널</label>
          <select id="discord-channel" name="discord_channel_id" value={channelId} onChange={(event) => setChannelId(event.target.value)} disabled={!connection || !botConfigured || loading || !!loadError} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">{loading ? "채널 불러오는 중…" : "채널 선택"}</option>
            {connection?.channel_id && !channels.some((entry) => entry.id === connection.channel_id) && <option value={connection.channel_id}>#{connection.channel_name} {loading ? "" : "(권한 확인 필요)"}</option>}
            {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
          </select>
          <div className="min-h-5 text-xs text-muted-foreground">{loadError ? <span role="alert">{loadError} <button type="button" className="underline" onClick={() => { setLoading(true); setLoadError(""); setRefresh((value) => value + 1); }}>다시 불러오기</button></span> : connection && !loading && botConfigured && !channels.length ? "메시지를 보낼 수 있는 채널이 없습니다. 봇의 채널 권한을 확인해 주세요." : "봇이 메시지를 보낼 수 있는 텍스트 채널만 표시됩니다."}</div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input name="discord_enabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!connection || !botConfigured && !enabled} className="size-4 accent-primary" />Discord 알림 사용</label>
        <p className="text-xs text-muted-foreground">일정별 발송 시점은 일정 등록·편집창에서 선택합니다. 투표 알림도 이 채널로 전달됩니다.</p>
        <label className="flex items-start gap-2 border-t pt-4 text-xs"><input name="kakao_notifications_opt_in" type="checkbox" defaultChecked={kakaoNotificationsOptIn} className="mt-0.5 size-4 shrink-0 accent-primary" /><span>카카오 알림톡 연동 시 수신 희망<span className="mt-1 block text-muted-foreground">현재는 수신 의사만 저장하며 메시지를 발송하지 않습니다.</span></span></label>
        {canEdit && premium && <Button type="submit" disabled={pending || enabled && (loading || !!loadError || !channelId)}>저장</Button>}
      </fieldset>
    </form>
  </div>;
}
