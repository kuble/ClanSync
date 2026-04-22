"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  applyLfgPostAction,
  cancelLfgApplicationAction,
  cancelLfgPostAction,
  createLfgPostAction,
  createPromotionPostAction,
  acceptLfgApplicationAction,
  rejectLfgApplicationAction,
} from "@/app/actions/main-game-community";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  LfgApplicantRow,
  LfgRowOut,
  PromoRow,
  PromoSort,
  RankClanRow,
} from "@/lib/main-game/load-main-game-hub";

type Props = {
  gameSlug: string;
  promoSort: PromoSort;
  promos: PromoRow[];
  lfgs: LfgRowOut[];
  applicantsByPost: Record<string, LfgApplicantRow[]>;
  rankClans: RankClanRow[];
  canPostPromo: boolean;
  canCreateLfg: boolean;
  userId: string;
  clanHubHref: string;
};

function badgeForStatus(s: string | null): { label: string; className: string } | null {
  if (!s) return null;
  if (s === "applied") return { label: "신청됨", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" };
  if (s === "accepted") return { label: "수락됨", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (s === "rejected") return { label: "거절됨", className: "bg-muted text-muted-foreground" };
  if (s === "canceled") return { label: "취소됨", className: "bg-muted text-muted-foreground" };
  if (s === "expired") return { label: "만료", className: "bg-muted text-muted-foreground" };
  return null;
}

export function MainGameCommunityTabs({
  gameSlug,
  promoSort,
  promos,
  lfgs,
  applicantsByPost,
  rankClans,
  canPostPromo,
  canCreateLfg,
  userId,
  clanHubHref,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [promoTitle, setPromoTitle] = useState("");
  const [promoBody, setPromoBody] = useState("");

  const defaultExp = useMemo(() => {
    const d = new Date(Date.now() + 3 * 3600000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  }, []);

  const [lfgMode, setLfgMode] = useState("경쟁전");
  const [lfgFormat, setLfgFormat] = useState("5vs5");
  const [lfgSlots, setLfgSlots] = useState(2);
  const [lfgHour, setLfgHour] = useState(20);
  const [lfgExp, setLfgExp] = useState(defaultExp);
  const [lfgMic, setLfgMic] = useState(false);
  const [lfgDesc, setLfgDesc] = useState("");

  const [applyMsg, setApplyMsg] = useState<Record<string, string>>({});

  function onPromoSortChange(next: PromoSort) {
    router.push(
      `/games/${encodeURIComponent(gameSlug)}?promoSort=${next === "space" ? "space" : "newest"}`,
    );
  }

  function submitPromo(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await createPromotionPostAction(gameSlug, promoTitle, promoBody);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("홍보글이 등록되었습니다.");
      setPromoTitle("");
      setPromoBody("");
    });
  }

  function submitLfg(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await createLfgPostAction(gameSlug, {
        mode: lfgMode,
        format: lfgFormat,
        slots: lfgSlots,
        startTimeHour: lfgHour,
        expiresAtIso: new Date(lfgExp).toISOString(),
        micRequired: lfgMic,
        description: lfgDesc,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("LFG 모집을 등록했습니다.");
      setLfgDesc("");
    });
  }

  const g = encodeURIComponent(gameSlug);

  return (
    <Tabs defaultValue="home" className="w-full">
      <TabsList variant="line" className="mb-6 w-full flex-wrap gap-1">
        <TabsTrigger value="home">홈</TabsTrigger>
        <TabsTrigger value="promo">홍보</TabsTrigger>
        <TabsTrigger value="lfg">LFG</TabsTrigger>
        <TabsTrigger value="rank">순위</TabsTrigger>
        <TabsTrigger value="scrim">스크림</TabsTrigger>
      </TabsList>

      <TabsContent value="home" className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          클랜 일정·통계·스토어는{" "}
          <Link href={clanHubHref} className="text-primary underline-offset-4 hover:underline">
            클랜 화면
          </Link>
          에서 이용할 수 있습니다.
        </p>
        <div>
          <p className="font-medium">최근 홍보</p>
          {!promos.length ? (
            <p className="text-muted-foreground mt-2 rounded-lg border border-dashed p-4 text-xs">
              아직 홍보 글이 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {promos.slice(0, 5).map((p) => (
                <li key={p.id} className="bg-card rounded-lg border px-3 py-2 text-xs shadow-sm">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted-foreground"> · {p.clan_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          D-RANK-01: 정렬은 최신 / 여유 인원(활성 멤버 기준) 두 가지입니다.
        </p>
      </TabsContent>

      <TabsContent value="promo" className="space-y-6 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground text-xs">정렬</label>
          <select
            className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
            value={promoSort}
            disabled={pending}
            onChange={(e) =>
              onPromoSortChange(e.target.value === "space" ? "space" : "newest")
            }
          >
            <option value="newest">최신순</option>
            <option value="space">여유 있는 클랜순</option>
          </select>
        </div>

        {canPostPromo ? (
          <form onSubmit={submitPromo} className="bg-card space-y-3 rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-medium">홍보 글 작성</p>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="제목"
              value={promoTitle}
              disabled={pending}
              onChange={(e) => setPromoTitle(e.target.value)}
              required
            />
            <textarea
              className="border-input bg-background min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="내용"
              value={promoBody}
              disabled={pending}
              onChange={(e) => setPromoBody(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={pending}>
              등록
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-xs">
            홍보글은 해당 게임에 소속된 클랜이 있을 때만 작성할 수 있습니다.{" "}
            <Link href={`/games/${g}/clan`} className="text-primary underline-offset-4 hover:underline">
              클랜 온보딩
            </Link>
          </p>
        )}

        {!promos.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            등록된 홍보가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {promos.map((p) => (
              <li
                key={p.id}
                className="bg-card rounded-xl border px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{p.title}</p>
                  <Link
                    href={`/games/${g}/clan/${p.clan_id}`}
                    className="text-muted-foreground text-xs hover:underline"
                  >
                    {p.clan_name}
                  </Link>
                </div>
                <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-xs">
                  {p.content || "—"}
                </p>
                <p className="text-muted-foreground mt-2 text-[11px]">
                  {new Date(p.created_at).toLocaleString("ko-KR")} · 활성 {p.active_members}/
                  {p.max_members}명 (남은 자리 {p.space_remaining})
                </p>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="lfg" className="space-y-6 text-sm">
        {canCreateLfg ? (
          <form onSubmit={submitLfg} className="bg-card space-y-3 rounded-xl border p-4 shadow-sm">
            <p className="text-xs font-medium">LFG 모집 등록 (D-LFG-01)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">모드</span>
                <input
                  className="border-input bg-background w-full rounded-md border px-2 py-1.5"
                  value={lfgMode}
                  disabled={pending}
                  onChange={(e) => setLfgMode(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">포맷</span>
                <input
                  className="border-input bg-background w-full rounded-md border px-2 py-1.5"
                  value={lfgFormat}
                  disabled={pending}
                  onChange={(e) => setLfgFormat(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">모집 인원 (슬롯)</span>
                <input
                  type="number"
                  min={1}
                  max={11}
                  className="border-input bg-background w-full rounded-md border px-2 py-1.5"
                  value={lfgSlots}
                  disabled={pending}
                  onChange={(e) => setLfgSlots(Number(e.target.value))}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">시작 시각 (시, 0–23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="border-input bg-background w-full rounded-md border px-2 py-1.5"
                  value={lfgHour}
                  disabled={pending}
                  onChange={(e) => setLfgHour(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">모집 마감 (로컬 시각)</span>
              <input
                type="datetime-local"
                className="border-input bg-background rounded-md border px-2 py-1.5"
                value={lfgExp}
                disabled={pending}
                onChange={(e) => setLfgExp(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={lfgMic}
                disabled={pending}
                onChange={(e) => setLfgMic(e.target.checked)}
              />
              마이크 필수
            </label>
            <textarea
              className="border-input bg-background min-h-[72px] w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="한마디 (선택)"
              value={lfgDesc}
              disabled={pending}
              onChange={(e) => setLfgDesc(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={pending}>
              모집 등록
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-xs">
            LFG는 게임 계정 연동 후 이용할 수 있습니다.{" "}
            <Link href={`/games/${g}/auth`} className="text-primary underline-offset-4 hover:underline">
              연동하기
            </Link>
          </p>
        )}

        {!lfgs.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            진행 중인 LFG가 없습니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {lfgs.map((row) => {
              const isCreator = row.creator_user_id === userId;
              const badge = badgeForStatus(row.my_status);
              const applicants = applicantsByPost[row.id] ?? [];

              return (
                <li
                  key={row.id}
                  className="bg-card relative rounded-xl border px-4 py-3 shadow-sm"
                >
                  {badge ? (
                    <span
                      className={cn(
                        "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-baseline gap-2 pr-16">
                    <span className="font-medium">
                      {row.mode} · {row.format}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      모집 {row.slots}명 · 신청 {row.applied_count}명
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    모집자 {row.creator_nickname} · 시작 약 {row.start_time_hour}시 · 마감{" "}
                    {new Date(row.expires_at).toLocaleString("ko-KR")}
                    {row.mic_required ? " · 마이크 필요" : ""}
                  </p>
                  {row.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs">{row.description}</p>
                  ) : null}

                  {!isCreator && !row.my_status ? (
                    <div className="mt-3 space-y-2">
                      <input
                        className="border-input bg-background w-full max-w-md rounded-md border px-2 py-1.5 text-xs"
                        placeholder="신청 메모 (선택)"
                        value={applyMsg[row.id] ?? ""}
                        disabled={pending}
                        onChange={(e) =>
                          setApplyMsg((m) => ({ ...m, [row.id]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const r = await applyLfgPostAction(
                              gameSlug,
                              row.id,
                              applyMsg[row.id],
                            );
                            if (!r.ok) {
                              toast.error(r.error);
                              return;
                            }
                            toast.success("신청했습니다.");
                          });
                        }}
                      >
                        참여 신청
                      </Button>
                    </div>
                  ) : null}

                  {!isCreator &&
                  row.my_status === "applied" &&
                  row.my_application_id ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const r = await cancelLfgApplicationAction(
                              gameSlug,
                              row.my_application_id!,
                            );
                            if (!r.ok) toast.error(r.error);
                            else toast.success("신청을 취소했습니다.");
                          });
                        }}
                      >
                        신청 취소
                      </Button>
                    </div>
                  ) : null}

                  {isCreator ? (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-xs font-medium">
                        신청자 {applicants.length}명
                      </p>
                      {!applicants.length ? (
                        <p className="text-muted-foreground text-xs">대기 중인 신청이 없습니다.</p>
                      ) : (
                        <ul className="space-y-2">
                          {applicants.map((a) => (
                            <li
                              key={a.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                            >
                              <span>
                                {a.applicant_nickname}
                                {a.message ? ` — ${a.message}` : ""}
                              </span>
                              <span className="flex gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[11px]"
                                  disabled={pending}
                                  onClick={() => {
                                    start(async () => {
                                      const r = await acceptLfgApplicationAction(
                                        gameSlug,
                                        row.id,
                                        a.id,
                                      );
                                      if (!r.ok) toast.error(r.error);
                                      else toast.success("수락했습니다.");
                                    });
                                  }}
                                >
                                  수락
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px]"
                                  disabled={pending}
                                  onClick={() => {
                                    start(async () => {
                                      const r = await rejectLfgApplicationAction(
                                        gameSlug,
                                        row.id,
                                        a.id,
                                      );
                                      if (!r.ok) toast.error(r.error);
                                      else toast.success("거절했습니다.");
                                    });
                                  }}
                                >
                                  거절
                                </Button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const r = await cancelLfgPostAction(gameSlug, row.id);
                            if (!r.ok) toast.error(r.error);
                            else toast.success("모집을 취소했습니다.");
                          });
                        }}
                      >
                        모집 취소
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="rank" className="space-y-3 text-sm">
        <p className="text-muted-foreground text-xs">
          활동 기준 미리보기: 최근 활동 시각 순 (외부 순위표 정책 D-ECON-03와 별개의 경량 목록).
        </p>
        {!rankClans.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            표시할 클랜이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">클랜</th>
                  <th className="px-3 py-2 font-medium">활성 멤버</th>
                  <th className="px-3 py-2 font-medium">최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {rankClans.map((c, i) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">
                      <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}</span>
                      <Link
                        href={`/games/${g}/clan/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {c.active_members}/{c.max_members}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {c.last_activity_at
                        ? new Date(c.last_activity_at).toLocaleString("ko-KR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="scrim" className="text-muted-foreground space-y-2 text-sm">
        <p>
          스크림 채팅·양측 확정(D-SCRIM-01/02)은 Phase 2+ 범위입니다.
        </p>
      </TabsContent>
    </Tabs>
  );
}
