"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { listClanDiscordChannelsAction, updateClanEventNotifyAction } from "@/app/actions/clan-event-notify";
import { DISCORD_NOTIFICATION_TYPES, type DiscordNotificationRoutes } from "@/lib/clan/discord-notification-settings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DiscordBenefitsGallery } from "./discord-benefits-gallery";
import { HelpText } from "./help-text";
import { useAutosave, AutosaveStatus } from "@/components/ui/use-autosave";

export type EventNotifyConnection = { guild_name: string; channel_id: string | null; channel_name: string | null };
type Props = {
  gameSlug: string; clanId: string; discordEnabled: boolean;
  canEdit: boolean; premium: boolean; botConfigured: boolean; connection: EventNotifyConnection | null;
  routes: DiscordNotificationRoutes; connectionResult?: string;
};

function Toggle({ name, label, checked, onChange, disabled, controls }: { name: string; label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; controls?: string }) {
  return <Switch name={name} aria-label={label} aria-controls={controls} checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />;
}

export function ClanDiscordSettings({ gameSlug, clanId, discordEnabled, canEdit, premium, botConfigured, connection, routes: initialRoutes, connectionResult }: Props) {
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(canEdit && premium && !!connection && botConfigured);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const autosave = useAutosave({ channelId: connection?.channel_id ?? "", enabled: discordEnabled, routes: initialRoutes }, async (draft) => {
    if (!canEdit || !premium) return { ok: false, error: "알림 설정은 Premium 클랜의 클랜장만 변경할 수 있습니다." };
    if (draft.enabled && !draft.channelId) return { ok: false, error: "기본 알림 채널을 선택해 주세요." };
    const form = new FormData();
    form.set("discord_channel_id", draft.channelId);
    form.set("discord_enabled", draft.enabled ? "on" : "off");
    for (const { id } of DISCORD_NOTIFICATION_TYPES) {
      form.set(`discord_${id}_enabled`, draft.routes[id].enabled ? "on" : "off");
      form.set(`discord_${id}_channel`, draft.routes[id].channel_id);
    }
    form.set("discord_polls_created", draft.routes.polls.created ? "on" : "off");
    form.set("discord_polls_ended", draft.routes.polls.ended ? "on" : "off");
    return updateClanEventNotifyAction(gameSlug, clanId, form);
  });
  const { channelId, enabled, routes } = autosave.value;
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

  const selectClass = "h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 sm:max-w-64";
  const status = !connection ? "연결 안 됨" : !channelId ? "채널 선택 필요" : !botConfigured ? "연결 확인 필요" : enabled ? "알림 사용 중" : "알림 꺼짐";
  const channelDisabled = !canEdit || !premium || !connection || !botConfigured || loading || !!loadError;
  return <div className="space-y-5" data-testid="clan-event-notify-settings">
    {connectionResult === "failed" && <p role="alert" className="text-sm text-destructive">Discord 연결을 완료하지 못했습니다. 서버 관리 권한과 봇 초대를 확인해 주세요.</p>}
    {connectionResult === "connected" && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Check className="size-4" />서버를 연결했습니다. 기본 알림 채널을 선택해 주세요.</p>}
    <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Discord 알림 설정">
    <form onSubmit={(event) => event.preventDefault()}>
      <div className="p-5">
      <div className="flex items-start gap-4 sm:items-center">
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold"><HelpText label="Discord" help="자동 알림은 클랜 전체에 적용됩니다." /></h4><span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{status}</span></div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{connection ? `${connection.guild_name}${connection.channel_name ? ` · #${connection.channel_name}` : ""}` : "일정과 소식을 우리 서버에 자동으로 전달하세요."}</p></div>
        <div className="flex flex-wrap items-center gap-2">
        <Dialog><DialogTrigger render={<Button size="sm" variant="outline" aria-label="Discord 활용 예시" />}>활용 예시</DialogTrigger>
          <DialogContent className="board-scroll max-h-[85dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader className="pr-8"><DialogTitle>Discord 활용 예시</DialogTitle><DialogDescription>알림 종류별 메시지와 연결되는 화면을 확인하세요.</DialogDescription></DialogHeader><DiscordBenefitsGallery /></DialogContent>
        </Dialog>
        {canEdit && premium && <Button size="sm" nativeButton={!botConfigured} variant={connection ? "outline" : "default"} disabled={!botConfigured} render={botConfigured ? <a href={`/api/discord/connect?clanId=${encodeURIComponent(clanId)}`} /> : undefined}>
          <ExternalLink className="size-3.5" />{connection ? "서버 다시 연결" : "Discord 연결하기"}
        </Button>}
        </div>
      </div>
      <div className="flex h-8 shrink-0 items-center"><Toggle name="discord_enabled" label="Discord 알림 사용" controls="discord-notification-details" checked={enabled} onChange={(value) => autosave.update((current) => ({ ...current, enabled: value }))} disabled={!canEdit || !premium || !connection || !botConfigured && !enabled} /></div>
      </div>
      {!premium && <p className="mt-4 text-xs text-muted-foreground">자동 알림은 Premium 클랜에서 사용할 수 있습니다. <Link href={`/games/${gameSlug}/clan/${clanId}/manage?tab=subscription`} className="font-medium text-primary underline">플랜 보기</Link></p>}
      {!canEdit && <p className="mt-4 text-xs text-muted-foreground">연결과 알림 설정은 클랜장이 변경할 수 있습니다.</p>}
      {!botConfigured && <p className="mt-4 text-xs text-muted-foreground">ClanSync 공용 봇 연결을 준비 중입니다. 활용 예시에서 알림 화면을 확인하세요.</p>}
      </div>
          <div id="discord-notification-details" hidden={!enabled} className="mx-5 mb-5 border-l-2 border-primary/25 pl-4 sm:pl-5">
          <div className="overflow-hidden rounded-lg border border-border/70 bg-background/30">
          <div className="space-y-2 border-b border-border/70 p-4"><div id="discord-channel-label" className="text-[13px] font-semibold"><HelpText label="기본 알림 채널" help="봇에 채널 보기·메시지 보내기·링크 임베드 권한이 있는 채널을 선택하세요. Discord 자동 입장에도 이 채널을 사용하며 초대 생성 권한이 필요합니다. 권한이 없다면 서버 다시 연결로 추가할 수 있습니다." /></div>
            <div className="flex items-center justify-between gap-4">
            <select aria-labelledby="discord-channel-label" id="discord-channel" name="discord_channel_id" value={channelId} onChange={(event) => autosave.update((current) => ({ ...current, channelId: event.target.value }))} disabled={channelDisabled} className={selectClass}>
              <option value="">{loading ? "채널 불러오는 중…" : "채널 선택"}</option>
              {connection?.channel_id && !channels.some((entry) => entry.id === connection.channel_id) && <option value={connection.channel_id}>#{connection.channel_name} {loading ? "" : "(권한 확인 필요)"}</option>}
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
            </select>
            </div>
            {loadError && <p role="alert" className="text-xs text-destructive">{loadError} <button type="button" className="underline" onClick={() => { setLoading(true); setLoadError(""); setRefresh((value) => value + 1); }}>다시 불러오기</button></p>}
          </div>
          <section aria-label="종류별 알림">
          {DISCORD_NOTIFICATION_TYPES.map(({ id, label, description }) => <div key={id} className="space-y-3 border-b border-border/70 p-4 last:border-b-0">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] font-semibold"><HelpText label={id === "announcements" ? "공지 채널" : `${label} 채널`} help={description} /></div>
              <Toggle name={`discord_${id}_enabled`} label={`${label} 알림`} controls={`discord-${id}-details`} checked={routes[id].enabled} disabled={!canEdit || !premium} onChange={(value) => autosave.update((current) => ({ ...current, routes: { ...current.routes, [id]: { ...current.routes[id], enabled: value } } }))} />
            </div>
            <div id={`discord-${id}-details`} hidden={!routes[id].enabled} className="ml-3 space-y-3 border-l-2 border-primary/25 pl-3">
            <select aria-label={`${label} 알림 채널`} name={`discord_${id}_channel`} value={routes[id].channel_id} onChange={(event) => autosave.update((current) => ({ ...current, routes: { ...current.routes, [id]: { ...current.routes[id], channel_id: event.target.value } } }))} disabled={channelDisabled} className={`${selectClass} w-full`}>
              <option value="">기본 채널 사용</option>
              {routes[id].channel_id && !channels.some((channel) => channel.id === routes[id].channel_id) && <option value={routes[id].channel_id}>기존 채널 (권한 확인 필요)</option>}
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
            </select>
            {id === "polls" && <div className="space-y-3">{([['created', '시작 알림'], ['ended', '종료·결과 알림']] as const).map(([key, text]) => <label key={key} className="flex items-center justify-between gap-3 text-xs">{text}<Switch name={`discord_polls_${key}`} disabled={!canEdit || !premium} checked={routes.polls[key]} onChange={(event) => autosave.update((current) => ({ ...current, routes: { ...current.routes, polls: { ...current.routes.polls, [key]: event.target.checked } } }))} /></label>)}</div>}
            </div>
          </div>)}
          </section>
          </div>
          </div>
      {canEdit && premium && <div className="mx-5 mb-5 empty:hidden"><AutosaveStatus {...autosave} /></div>}
    </form>
    </section>
  </div>;
}
