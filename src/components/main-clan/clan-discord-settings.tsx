"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { listClanDiscordChannelsAction, updateClanEventNotifyAction } from "@/app/actions/clan-event-notify";
import { DISCORD_NOTIFICATION_TYPES, type DiscordNotificationRoutes } from "@/lib/clan/discord-notification-settings";
import { Button } from "@/components/ui/button";
import { DiscordBenefitsGallery } from "./discord-benefits-gallery";

export type EventNotifyConnection = { guild_name: string; channel_id: string | null; channel_name: string | null };
type Props = {
  gameSlug: string; clanId: string; discordEnabled: boolean; kakaoNotificationsOptIn: boolean;
  canEdit: boolean; premium: boolean; botConfigured: boolean; connection: EventNotifyConnection | null;
  routes: DiscordNotificationRoutes; connectionResult?: string;
};

function Toggle({ name, label, checked, onChange, disabled }: { name: string; label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="relative inline-flex shrink-0 cursor-pointer items-center">
    <input type="checkbox" role="switch" name={name} aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    <span aria-hidden className="h-6 w-11 rounded-full border border-border bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-40" />
    <span aria-hidden className="pointer-events-none absolute left-1 size-4 rounded-full bg-foreground/70 transition-transform peer-checked:translate-x-5 peer-checked:bg-primary-foreground" />
  </label>;
}

export function ClanDiscordSettings({ gameSlug, clanId, discordEnabled, kakaoNotificationsOptIn, canEdit, premium, botConfigured, connection, routes: initialRoutes, connectionResult }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(canEdit && premium && !!connection && botConfigured);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [channelId, setChannelId] = useState(connection?.channel_id ?? "");
  const [enabled, setEnabled] = useState(discordEnabled);
  const [routes, setRoutes] = useState(initialRoutes);
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
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    form.set("discord_channel_id", channelId);
    form.set("discord_enabled", enabled ? "on" : "off");
    for (const { id } of DISCORD_NOTIFICATION_TYPES) {
      form.set(`discord_${id}_enabled`, routes[id].enabled ? "on" : "off");
      form.set(`discord_${id}_channel`, routes[id].channel_id);
    }
    form.set("discord_polls_created", routes.polls.created ? "on" : "off");
    form.set("discord_polls_ended", routes.polls.ended ? "on" : "off");
    start(async () => {
      const result = await updateClanEventNotifyAction(gameSlug, clanId, form);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("알림 설정을 저장했습니다."); router.refresh();
    });
  }
  const selectClass = "h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";
  const status = !connection ? "연결 안 됨" : !connection.channel_id ? "채널 선택 필요" : !botConfigured ? "연결 확인 필요" : discordEnabled ? "알림 사용 중" : "알림 꺼짐";
  const channelDisabled = !canEdit || !connection || !botConfigured || loading || !!loadError;
  return <div className="space-y-5" data-testid="clan-event-notify-settings">
    {connectionResult === "failed" && <p role="alert" className="text-sm text-destructive">Discord 연결을 완료하지 못했습니다. 서버 관리 권한과 봇 초대를 확인해 주세요.</p>}
    {connectionResult === "connected" && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Check className="size-4" />서버를 연결했습니다. 기본 알림 채널을 선택해 주세요.</p>}
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex items-center gap-2"><h4 className="font-semibold">Discord</h4><span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{status}</span></div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{connection ? `${connection.guild_name}${connection.channel_name ? ` · #${connection.channel_name}` : ""}` : "일정과 소식을 우리 서버에 자동으로 전달하세요."}</p></div>
        {canEdit && premium && <Button size="sm" nativeButton={!botConfigured} variant={connection ? "outline" : "default"} disabled={!botConfigured} render={botConfigured ? <a href={`/api/discord/connect?clanId=${encodeURIComponent(clanId)}`} /> : undefined}>
          <ExternalLink className="size-3.5" />{connection ? "서버 다시 연결" : "Discord 연결하기"}
        </Button>}
      </div>
      {!premium && <p className="mt-4 text-xs text-muted-foreground">자동 알림은 Premium 클랜에서 사용할 수 있습니다. <Link href={`/games/${gameSlug}/clan/${clanId}/manage?tab=subscription`} className="font-medium text-primary underline">플랜 보기</Link></p>}
      {!canEdit && <p className="mt-4 text-xs text-muted-foreground">연결과 알림 설정은 클랜장이 변경할 수 있습니다.</p>}
      {!botConfigured && <p className="mt-4 text-xs text-muted-foreground">ClanSync 공용 봇 연결을 준비 중입니다. 아래에서 활용 예시를 확인하세요.</p>}
    </section>
    {connection ? <details className="rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer text-xs font-medium">Discord 활용 예시</summary><div className="mt-4"><DiscordBenefitsGallery /></div></details> : <DiscordBenefitsGallery />}
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset disabled={!canEdit || !premium || pending} className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4"><div><h4 className="text-sm font-semibold">Discord 알림 사용</h4><p className="mt-1 text-xs text-muted-foreground">이 설정은 클랜 전체에 적용됩니다.</p></div><Toggle name="discord_enabled" label="Discord 알림 사용" checked={enabled} onChange={setEnabled} disabled={!connection || !botConfigured && !enabled} /></div>
          <div className="mt-5 space-y-2"><label htmlFor="discord-channel" className="text-xs font-medium">기본 알림 채널</label>
            <select id="discord-channel" name="discord_channel_id" value={channelId} onChange={(event) => setChannelId(event.target.value)} disabled={channelDisabled} className={selectClass}>
              <option value="">{loading ? "채널 불러오는 중…" : "채널 선택"}</option>
              {connection?.channel_id && !channels.some((entry) => entry.id === connection.channel_id) && <option value={connection.channel_id}>#{connection.channel_name} {loading ? "" : "(권한 확인 필요)"}</option>}
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
            </select>
            <div className="min-h-5 text-xs leading-relaxed text-muted-foreground">{loadError ? <span role="alert">{loadError} <button type="button" className="underline" onClick={() => { setLoading(true); setLoadError(""); setRefresh((value) => value + 1); }}>다시 불러오기</button></span> : "채널 하나만 선택하면 준비 끝. 종류별 채널 분리는 선택 사항입니다."}</div>
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="종류별 알림">
          <div className="border-b border-border px-5 py-4"><h4 className="text-sm font-semibold">필요한 소식만 보내세요</h4><p className="mt-1 text-xs text-muted-foreground">전체 멘션 없이 전달합니다. 개인 수신은 Discord의 채널 알림 설정에서 조절하세요.</p></div>
          {DISCORD_NOTIFICATION_TYPES.map(({ id, label, description }) => <div key={id} className="space-y-3 border-b border-border p-5 last:border-b-0">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[13px] font-semibold">{label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div>
              <Toggle name={`discord_${id}_enabled`} label={`${label} 알림`} checked={routes[id].enabled} onChange={(value) => setRoutes((current) => ({ ...current, [id]: { ...current[id], enabled: value } }))} />
            </div>
            <select aria-label={`${label} 알림 채널`} name={`discord_${id}_channel`} value={routes[id].channel_id} onChange={(event) => setRoutes((current) => ({ ...current, [id]: { ...current[id], channel_id: event.target.value } }))} disabled={channelDisabled} className={`${selectClass} sm:max-w-64`}>
              <option value="">기본 채널 사용</option>
              {routes[id].channel_id && !channels.some((channel) => channel.id === routes[id].channel_id) && <option value={routes[id].channel_id}>기존 채널 (권한 확인 필요)</option>}
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
            </select>
            {id === "polls" && <div className="flex flex-wrap gap-5">{([['created', '시작 알림'], ['ended', '종료·결과 알림']] as const).map(([key, text]) => <label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" name={`discord_polls_${key}`} checked={routes.polls[key]} onChange={(event) => setRoutes((current) => ({ ...current, polls: { ...current.polls, [key]: event.target.checked } }))} className="size-4 accent-primary" />{text}</label>)}</div>}
          </div>)}
        </section>
        <label className="flex items-start gap-2 text-xs"><input name="kakao_notifications_opt_in" type="checkbox" defaultChecked={kakaoNotificationsOptIn} className="mt-0.5 size-4 accent-primary" /><span>카카오 알림톡 연동 시 수신 희망<span className="mt-1 block text-muted-foreground">현재는 수신 의사만 저장합니다.</span></span></label>
        {canEdit && premium && <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/95 py-3"><Button type="submit" disabled={pending || enabled && (loading || !!loadError || !channelId)}>{pending && <RefreshCw className="size-4 animate-spin" />}설정 저장</Button></div>}
      </fieldset>
    </form>
  </div>;
}
