"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateClanEventNotifyAction } from "@/app/actions/clan-event-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClanEventNotifyForm({
  gameSlug,
  clanId,
  discordEnabled,
  discordWebhookUrl,
  kakaoNotificationsOptIn,
  canEdit,
}: {
  gameSlug: string;
  clanId: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
  kakaoNotificationsOptIn: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateClanEventNotifyAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("알림 설정을 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <div
      className="bg-card space-y-4 rounded-xl border p-4 shadow-sm"
      data-testid="clan-event-notify-settings"
    >
      <div>
        <h3 className="text-sm font-medium">외부 채널 알림 설정</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          D-EVENTS-03 기준 프리미엄 클랜은 Discord 웹훅으로 일정·투표 알림 일부가
          전송될 수 있습니다. 카카오 알림톡은 기본 꺼짐 상태이며, 아래에서는
          <strong className="text-foreground font-medium">
            향후 수신 의사만
          </strong>
          저장합니다(번호 인증·실 발송 연동 Phase 2+).
        </p>
      </div>
      {!canEdit ? (
        <p className="text-muted-foreground text-sm">
          저장은 클랜장만 할 수 있습니다.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Discord
          </legend>
          <div className="flex items-center gap-2">
            <input
              id="discord-enabled"
              name="discord_enabled"
              type="checkbox"
              defaultChecked={discordEnabled}
              disabled={!canEdit}
              className="border-input size-4 rounded"
            />
            <Label htmlFor="discord-enabled" className="font-normal">
              Discord 알림 사용
            </Label>
          </div>
          <div className="space-y-2">
          <Label htmlFor="discord-webhook">웹훅 URL</Label>
          <Input
            id="discord-webhook"
            name="discord_webhook_url"
            type="url"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/…"
            defaultValue={discordWebhookUrl}
            disabled={!canEdit}
            className="font-mono text-xs"
          />
          </div>
        </fieldset>

        <fieldset className="space-y-3 border-t pt-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            카카오 알림톡 (예정)
          </legend>
          <div className="flex items-start gap-2">
            <input
              id="kakao-notifications-opt-in"
              name="kakao_notifications_opt_in"
              type="checkbox"
              defaultChecked={kakaoNotificationsOptIn}
              disabled={!canEdit}
              className="border-input mt-1 size-4 shrink-0 rounded"
            />
            <div>
              <Label htmlFor="kakao-notifications-opt-in" className="font-normal">
                이후 카카오 알림톡 연동 시 동의 접수
              </Label>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                지금 선택해도 메시지는 발송되지 않으며, 채널 구축이 완료되면
                quiet hours 및 백오프 정책(D-EVENTS-03)에 맞춰 활성화됩니다.
              </p>
            </div>
          </div>
        </fieldset>

        {canEdit ? (
          <Button type="submit" disabled={pending}>
            저장
          </Button>
        ) : null}
      </form>
    </div>
  );
}
