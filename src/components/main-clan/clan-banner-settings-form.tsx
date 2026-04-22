"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateClanBannerUrlAction } from "@/app/actions/clan-banner-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClanBannerSettingsForm({
  gameSlug,
  clanId,
  initialBannerUrl,
}: {
  gameSlug: string;
  clanId: string;
  initialBannerUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateClanBannerUrlAction(gameSlug, clanId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("배너 주소를 저장했습니다.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card space-y-4 rounded-xl border p-4 shadow-sm"
    >
      <div>
        <h3 className="text-sm font-medium">홍보 배너 URL</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          스토어에서 &quot;클랜 배너 슬롯&quot;을 구매한 뒤, https 이미지 주소를
          등록합니다. 비우면 배너를 숨깁니다.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="banner-url">이미지 URL (https)</Label>
        <Input
          id="banner-url"
          name="banner_url"
          type="url"
          placeholder="https://…"
          defaultValue={initialBannerUrl ?? ""}
          maxLength={2000}
          autoComplete="off"
          className="font-mono text-xs"
        />
      </div>
      <Button type="submit" disabled={pending}>
        저장
      </Button>
    </form>
  );
}
