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
  canEdit,
}: {
  gameSlug: string;
  clanId: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
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
    <div className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-medium">Discord 알림 (MVP)</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          일정 생성 시 웹훅으로 메시지를 보내는 기능은 Premium·백엔드 작업 연동
          후 활성화됩니다. 지금은 URL만 안전하게 저장합니다.
        </p>
      </div>
      {!canEdit ? (
        <p className="text-muted-foreground text-sm">
          저장은 클랜장만 할 수 있습니다. 운영진은 일정 등록만 가능합니다.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
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
        {canEdit ? (
          <Button type="submit" disabled={pending}>
            저장
          </Button>
        ) : null}
      </form>
    </div>
  );
}
