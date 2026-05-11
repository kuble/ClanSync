"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  voidClanStorePurchaseAction,
  voidPersonalStorePurchaseAction,
} from "@/app/actions/clan-store-purchase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ManageStoreVoidRowVM = {
  pool: "clan" | "personal";
  purchaseId: string;
  itemNameKo: string;
  buyerNickname: string;
  priceCoins: number;
  purchasedAtLabel: string;
  isBuyerSelf: boolean;
};

export function ClanManageStoreVoidPanel({
  gameSlug,
  clanId,
  clanRows,
  personalRows,
}: {
  gameSlug: string;
  clanId: string;
  clanRows: ManageStoreVoidRowVM[];
  personalRows: ManageStoreVoidRowVM[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ purchaseId: string; text: string } | null>(
    null,
  );

  if (clanRows.length === 0 && personalRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {clanRows.length > 0 ? (
        <VoidSection
          title="클랜 풀 구매 정정"
          description={
            <>
              D-STORE-03: 잘못된 <strong className="font-medium text-foreground">클랜 풀</strong>{" "}
              구매만 운영진이 무효화할 수 있습니다. 코인은 클랜 풀로 되돌리고, 배너 슬롯이면
              배너 URL도 해제됩니다.{" "}
              <strong className="font-medium text-foreground">구매 당사자 본인</strong>은 처리할 수
              없습니다.
            </>
          }
          gameSlug={gameSlug}
          clanId={clanId}
          pool="clan"
          rows={clanRows}
          pending={pending}
          startTransition={startTransition}
          feedback={feedback}
          setFeedback={setFeedback}
          routerRefresh={() => router.refresh()}
        />
      ) : null}

      {personalRows.length > 0 ? (
        <VoidSection
          title="개인 풀 구매 정정"
          description={
            <>
              같은 클랜의 <strong className="font-medium text-foreground">활동 멤버</strong>가
              개인 코인으로 산 항목 중 잘못된 결제를 운영진이 무효화합니다. 코인은 구매자
              개인 풀로 돌아가고, 프로필 입장 효과 상품이면 해당 스토어 네임플레이트 부여도
              처리됩니다.{" "}
              <strong className="font-medium text-foreground">구매 당사자 본인</strong>은 처리할 수
              없습니다.
            </>
          }
          gameSlug={gameSlug}
          clanId={clanId}
          pool="personal"
          rows={personalRows}
          pending={pending}
          startTransition={startTransition}
          feedback={feedback}
          setFeedback={setFeedback}
          routerRefresh={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function VoidSection({
  title,
  description,
  gameSlug,
  clanId,
  pool,
  rows,
  pending,
  startTransition,
  feedback,
  setFeedback,
  routerRefresh,
}: {
  title: string;
  description: ReactNode;
  gameSlug: string;
  clanId: string;
  pool: "clan" | "personal";
  rows: ManageStoreVoidRowVM[];
  pending: boolean;
  startTransition: (cb: () => void) => void;
  feedback: { purchaseId: string; text: string } | null;
  setFeedback: (v: { purchaseId: string; text: string } | null) => void;
  routerRefresh: () => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.purchaseId}
            className="border-border space-y-2 rounded-md border bg-muted/20 px-3 py-3"
          >
            <div className="text-sm">
              <span className="font-medium">{row.itemNameKo}</span>
              <span className="text-muted-foreground">
                {" "}
                · {row.priceCoins.toLocaleString("ko-KR")} 코인 · 구매자 {row.buyerNickname}
              </span>
              <div className="text-muted-foreground text-xs">{row.purchasedAtLabel}</div>
            </div>

            {row.isBuyerSelf ? (
              <p className="text-muted-foreground text-xs">
                본인이 구매한 건은 다른 운영진에게 무효화를 요청해 주세요.
              </p>
            ) : (
              <VoidRowForm
                pool={pool}
                gameSlug={gameSlug}
                clanId={clanId}
                purchaseId={row.purchaseId}
                disabled={pending}
                onResult={(text, ok) => {
                  setFeedback({ purchaseId: row.purchaseId, text });
                  if (ok) routerRefresh();
                }}
                startTransition={startTransition}
              />
            )}

            {feedback?.purchaseId === row.purchaseId ? (
              <p
                className={
                  feedback.text.startsWith("완료")
                    ? "text-sm text-emerald-600"
                    : "text-destructive text-sm"
                }
                role="status"
              >
                {feedback.text}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function VoidRowForm({
  pool,
  gameSlug,
  clanId,
  purchaseId,
  disabled,
  onResult,
  startTransition,
}: {
  pool: "clan" | "personal";
  gameSlug: string;
  clanId: string;
  purchaseId: string;
  disabled: boolean;
  onResult: (text: string, ok: boolean) => void;
  startTransition: (cb: () => void) => void;
}) {
  const [reason, setReason] = useState("");

  const confirmMsg =
    pool === "clan"
      ? "이 구매를 무효화하고 코인을 클랜 풀로 돌려보냅니다. 계속할까요?"
      : "이 구매를 무효화하고 코인을 구매자 개인 풀로 돌려보냅니다. 계속할까요?";

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(confirmMsg)) {
          return;
        }
        startTransition(async () => {
          const r =
            pool === "clan"
              ? await voidClanStorePurchaseAction(
                  gameSlug,
                  clanId,
                  purchaseId,
                  reason.trim(),
                )
              : await voidPersonalStorePurchaseAction(
                  gameSlug,
                  clanId,
                  purchaseId,
                  reason.trim(),
                );
          if (r.ok) {
            onResult("완료: 무효화되었습니다.", true);
            setReason("");
          } else {
            onResult(r.error, false);
          }
        });
      }}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={`void-reason-${pool}-${purchaseId}`} className="text-xs">
          사유 (감사 로그)
        </Label>
        <Input
          id={`void-reason-${pool}-${purchaseId}`}
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 중복 구매 오류"
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="destructive" size="sm" disabled={disabled}>
        무효화
      </Button>
    </form>
  );
}
