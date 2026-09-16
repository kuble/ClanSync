"use client";

import { useEffect, useState } from "react";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export type BalanceGuideStage =
  | "roster"
  | "formation"
  | "map-types"
  | "map-manual"
  | "map-vote"
  | "map-result"
  | "hero-vote"
  | "hero-result"
  | "match";
const GUIDES: Record<
  BalanceGuideStage,
  { target: string; title: string; text: string }[]
> = {
  roster: [
    {
      target: "board",
      title: "대기방과 같은 자리",
      text: "클랜원을 누르면 1팀부터 채워집니다. 이름을 끌어 자리를 바꾸고, 우클릭으로 비울 수 있습니다.",
    },
    {
      target: "settings",
      title: "이번 라운드의 규칙",
      text: "역할·팀 편성 방식과 맵 밴·영웅 밴을 설정하세요.",
    },
    {
      target: "primary",
      title: "준비되면 편성 시작",
      text: "열 명을 정하고 편성을 시작하세요. 명단과 개인 선호는 자동으로 반영됩니다.",
    },
  ],
  formation: [
    {
      target: "board",
      title: "팀 편성 확인",
      text: "역할과 팀이 모두 정해지면 결과를 확인하세요.",
    },
    {
      target: "primary",
      title: "편성 적용",
      text: "편성 적용을 누르면 맵을 고르는 화면으로 이동합니다.",
    },
  ],
  "map-types": [
    {
      target: "map-types",
      title: "투표할 맵 유형",
      text: "쟁탈·밀기·화물·혼합을 함께 고를 수 있습니다. 전체를 누르면 모든 유형을 포함합니다.",
    },
    {
      target: "primary",
      title: "선택을 마치면 바로 투표",
      text: "유형 선택 완료를 누르면 후보 맵 세 곳이 공개되고 투표 시간이 시작됩니다.",
    },
  ],
  "map-manual": [
    {
      target: "map-types",
      title: "맵 유형 선택",
      text: "맵 유형을 누르면 해당 전장들이 이미지로 펼쳐집니다.",
    },
    {
      target: "map-picker",
      title: "이미지로 맵 고르기",
      text: "맵을 누르면 강조 표시와 함께 저장됩니다. 이미지를 보고 원하는 전장을 선택하세요.",
    },
    {
      target: "primary",
      title: "선택 후 경기 시작",
      text: "맵이 저장되면 다음 버튼이 활성화됩니다. 영웅 밴을 사용하는 라운드는 영웅 밴을 거쳐 경기를 시작합니다.",
    },
  ],
  "map-vote": [
    {
      target: "map-vote",
      title: "원하는 맵에 투표",
      text: "맵 이미지를 눌러 투표하세요. 마감 전까지 선택을 바꿀 수 있고 득표 비율만큼 추첨 확률이 높아집니다.",
    },
    {
      target: "primary",
      title: "마감 후 맵 공개",
      text: "시간이 끝나면 운영진이 맵을 확정합니다. 모두에게 같은 추첨 결과가 표시되고 다음 단계로 자동 이동합니다.",
    },
  ],
  "map-result": [
    {
      target: "map-vote",
      title: "선정된 맵",
      text: "이번 라운드에 선정된 맵을 확인하세요.",
    },
    {
      target: "primary",
      title: "다음 단계로",
      text: "영웅 밴을 사용하면 밴 투표로, 사용하지 않으면 경기 시작으로 이어집니다.",
    },
  ],
  "hero-vote": [
    {
      target: "hero-vote",
      title: "영웅 밴 투표",
      text: "서로 다른 영웅 세 명을 순서대로 선택하고 투표 반영을 누르세요. 출전자만 투표할 수 있습니다.",
    },
    {
      target: "primary",
      title: "밴 결과 확인",
      text: "투표가 끝나면 운영진이 결과를 확정한 뒤 경기를 시작합니다.",
    },
  ],
  "hero-result": [
    {
      target: "hero-vote",
      title: "확정된 영웅 밴",
      text: "이번 라운드에서 제외할 영웅을 확인하세요.",
    },
    {
      target: "primary",
      title: "경기 시작",
      text: "맵과 밴이 준비되면 경기 시작을 누르세요.",
    },
  ],
  match: [
    {
      target: "board",
      title: "진행 중인 라운드",
      text: "맵과 양 팀을 확인하고 경기 결과를 기록하세요.",
    },
    {
      target: "history",
      title: "내전 기록",
      text: "기록에서 라운드 결과와 개인 승률을 확인할 수 있습니다.",
    },
  ],
};

export function ClanBalanceGuide({
  open,
  onOpenChange,
  stage,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  stage: BalanceGuideStage;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const steps = GUIDES[stage];
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
