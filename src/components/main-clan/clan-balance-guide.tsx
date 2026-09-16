"use client";

import { useEffect, useState } from "react";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export function ClanBalanceGuide({
  open,
  onOpenChange,
  editing,
  canManage,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  editing: boolean;
  canManage: boolean;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const steps =
    editing && canManage
      ? [
          {
            target: "board",
            title: "대기방과 같은 자리",
            text: "딜러 두 칸 · 가운데 탱커 · 아래 힐러 두 칸입니다. 아래 클랜원을 누르면 1팀부터 채워지고 자동 저장됩니다. 이름을 끌어 자리를 바꾸고, 우클릭으로 비울 수 있습니다.",
          },
          {
            target: "settings",
            title: "이번 내전의 규칙",
            text: "설정에서 역할 추첨·팀 선발 방식과 맵 밴·영웅 밴을 정합니다. 클랜원은 편성 시작 전까지 본인의 역할 선호를 바꿀 수 있습니다.",
          },
          {
            target: "primary",
            title: "준비되면 편성 시작",
            text: "열 명을 정하고 편성 시작을 누르세요. 저장과 선호 반영은 자동이며 모두에게 같은 추첨 과정과 결과가 표시됩니다.",
          },
          {
            target: "history",
            title: "기록은 여기서",
            text: "진행 화면을 떠나지 않고 라운드별 결과와 승률·연패를 확인할 수 있습니다.",
          },
        ]
      : [
          {
            target: "board",
            title: "이번 라운드",
            text: "역할과 팀 배치, 진행 중인 편성을 함께 볼 수 있습니다. 지명과 경매에서는 현재 차례와 본인 권한에 맞는 조작이 열립니다.",
          },
          {
            target: "history",
            title: "내전 기록",
            text: "기록에서 세션별 라운드 결과와 개인 승률을 확인하세요. 진행 중이거나 무효인 경기는 승패 통계에 포함되지 않습니다.",
          },
        ];
  const visibleStep = Math.min(step, steps.length - 1);
  const current = steps[visibleStep];
  useEffect(() => {
    if (!open) return;
    const target = document.querySelector(
      `[data-balance-guide="${current.target}"]`,
    );
    target?.scrollIntoView({ block: "center", behavior: "instant" });
    const measure = () => {
      const r = target?.getBoundingClientRect();
      setRect(
        r
          ? {
              top: Math.max(8, r.top - 5),
              left: Math.max(8, r.left - 5),
              width: Math.min(r.width + 10, window.innerWidth - 16),
              height: Math.min(r.height + 10, window.innerHeight - 16),
            }
          : null,
      );
    };
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, current.target]);
  return (
    <Primitive.Root
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setStep(0);
      }}
    >
      <Primitive.Portal>
        <Primitive.Backdrop className="fixed inset-0 z-50 bg-black/65" />
        {rect ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 rounded-xl ring-2 ring-primary ring-offset-4 ring-offset-transparent"
            style={rect}
          />
        ) : null}
        <Primitive.Popup className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border bg-background p-5 shadow-2xl outline-none">
          <p className="mb-2 text-xs text-muted-foreground">
            {visibleStep + 1} / {steps.length}
          </p>
          <Primitive.Title className="font-semibold">
            {current.title}
          </Primitive.Title>
          <Primitive.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {current.text}
          </Primitive.Description>
          <div className="mt-5 flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                setStep(0);
              }}
            >
              닫기
            </Button>
            <div className="flex gap-2">
              {visibleStep > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(visibleStep - 1)}
                >
                  이전
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  if (visibleStep === steps.length - 1) {
                    onOpenChange(false);
                    setStep(0);
                  } else setStep(visibleStep + 1);
                }}
              >
                {visibleStep === steps.length - 1 ? "완료" : "다음"}
              </Button>
            </div>
          </div>
        </Primitive.Popup>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
