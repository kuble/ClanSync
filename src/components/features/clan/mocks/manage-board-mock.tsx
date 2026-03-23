"use client";

import { Search, Settings2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClanMemberListRow } from "@/lib/clan/load-clan-manage";

interface ManageBoardMockProps {
  pending: ClanMemberListRow[];
  active: ClanMemberListRow[];
}

export function ManageBoardMock({ pending, active }: ManageBoardMockProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">클랜 관리</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          가입 승인·멤버·기본 설정을 다룹니다. 버튼은 목업이며 서버 연동 전에는
          동작하지 않습니다.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="닉네임 · 배틀태그 검색 (목업)"
            className="pl-9"
            disabled
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5">
          <Settings2 className="size-4" aria-hidden />
          클랜 설정
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="text-muted-foreground size-4" aria-hidden />
            <CardTitle>가입 요청</CardTitle>
            <Badge variant="secondary">{pending.length}</Badge>
          </div>
          <CardDescription>
            승인 시 <code className="text-xs">clan_members.status</code> 가
            active 로 바뀌는 플로우를 이후 연동합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              대기 중인 요청이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>닉네임</TableHead>
                  <TableHead>게임 ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">
                      {row.displayName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.gameUid}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">대기</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" size="sm" variant="default">
                          승인
                        </Button>
                        <Button type="button" size="sm" variant="outline">
                          거절
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>구성원</CardTitle>
          <CardDescription>
            역할 변경·강퇴는 클랜장 / 운영진 권한에 따라 제한됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>닉네임</TableHead>
                <TableHead>게임 ID</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium">
                    {row.displayName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.gameUid}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.joinedAt
                      ? new Date(row.joinedAt).toLocaleDateString("ko-KR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="ghost">
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">클랜 프로필 (읽기 목업)</CardTitle>
          <CardDescription>
            태그·연령·성별 정책·외부 링크 — 실데이터는 Supabase `clans` 와 동기화
            예정
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>태그</Label>
              <div className="flex flex-wrap gap-1.5">
                {["경쟁", "성인", "마이크 필수"].map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>연령 / 성별 정책</Label>
              <p className="text-muted-foreground text-sm">20대 이상 · 전체</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm">
            <span className="text-muted-foreground">디스코드</span>
            <span className="text-primary truncate underline-offset-4 hover:underline">
              discord.gg/phoenix-rising-mock
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
