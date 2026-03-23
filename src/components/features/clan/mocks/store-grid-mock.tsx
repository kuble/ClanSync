"use client";

import { Lock, Palette, Sparkles, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { ProFeatureBadge } from "./pro-feature-badge";

const CLAN_ITEMS = [
  {
    id: "c1",
    name: "배너 그라데이션 팩",
    price: 1200,
    pool: "clan" as const,
    pro: false,
    desc: "클랜 홈 상단 배너 스타일 3종",
  },
  {
    id: "c2",
    name: "홍보글 상단 고정 7일",
    price: 800,
    pool: "clan" as const,
    pro: false,
    desc: "게임 커뮤니티 노출 부스트 (목업)",
  },
  {
    id: "c3",
    name: "클랜 배지 애니메이션",
    price: 2000,
    pool: "clan" as const,
    pro: true,
    desc: "프로필 배지에 은은한 글로우",
  },
];

const PERSONAL_ITEMS = [
  {
    id: "p1",
    name: "닉네임 컬러 틴트",
    price: 400,
    pool: "personal" as const,
    pro: false,
    desc: "게임별로 독립 적용",
  },
  {
    id: "p2",
    name: "프로필 테두리 세트",
    price: 600,
    pool: "personal" as const,
    pro: false,
    desc: "시즌 한정 프레임",
  },
  {
    id: "p3",
    name: "승부예측 코인 보너스 패스",
    price: 1500,
    pool: "personal" as const,
    pro: true,
    desc: "PRO · 예측 참여 시 보너스 (목업)",
  },
];

function CoinAmount({ n }: { n: number }) {
  return (
    <span className="text-amber-200/90 font-semibold tabular-nums">
      {n.toLocaleString("ko-KR")}
      <span className="text-muted-foreground ml-0.5 text-xs font-normal">
        코인
      </span>
    </span>
  );
}

function ItemCard({
  name,
  desc,
  price,
  lockedPro,
}: {
  name: string;
  desc: string;
  price: number;
  lockedPro: boolean;
}) {
  return (
    <Card
      size="sm"
      className={cn(lockedPro && "border-muted relative overflow-hidden")}
    >
      {lockedPro ? (
        <div
          className="bg-background/60 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]"
          aria-hidden
        >
          <Lock className="text-muted-foreground size-6" />
          <ProFeatureBadge />
        </div>
      ) : null}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-snug">{name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {desc}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between border-t border-border/60 pt-3">
        <CoinAmount n={price} />
        <Button type="button" size="sm" variant="secondary" disabled={lockedPro}>
          구매
        </Button>
      </CardFooter>
    </Card>
  );
}

export function StoreGridMock() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">클랜 스토어</h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            클랜 풀·개인 풀 코인으로 꾸미기 아이템을 구매합니다. 현금 거래 없음.
            (목업)
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Palette className="text-muted-foreground size-4" aria-hidden />
            <span className="text-muted-foreground">클랜 풀</span>
            <CoinAmount n={15400} />
          </div>
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <UserCircle2 className="text-muted-foreground size-4" aria-hidden />
            <span className="text-muted-foreground">내 코인</span>
            <CoinAmount n={3200} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="clan">
        <TabsList variant="line">
          <TabsTrigger value="clan" className="gap-1.5">
            <Sparkles className="size-3.5 opacity-70" aria-hidden />
            클랜 꾸미기
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-1.5">
            <UserCircle2 className="size-3.5 opacity-70" aria-hidden />
            개인 꾸미기
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clan" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CLAN_ITEMS.map((it) => (
              <ItemCard
                key={it.id}
                name={it.name}
                desc={it.desc}
                price={it.price}
                lockedPro={it.pro}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="personal" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PERSONAL_ITEMS.map((it) => (
              <ItemCard
                key={it.id}
                name={it.name}
                desc={it.desc}
                price={it.price}
                lockedPro={it.pro}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
