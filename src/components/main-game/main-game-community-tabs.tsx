"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import {
  attachGuestClanToScrimAction,
  cancelScrimRoomAction,
  confirmScrimSideAction,
  createDraftScrimRoomAction,
  updateScrimRoomDetailsAction,
} from "@/app/actions/scrim-rooms";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  LfgApplicantRow,
  LfgRowOut,
  PromoRow,
  PromoSort,
  RankClanRow,
  ScrimGuestClanOption,
  ScrimRoomRowOut,
} from "@/lib/main-game/load-main-game-hub";

type Props = {
  gameSlug: string;
  promoSort: PromoSort;
  promos: PromoRow[];
  lfgs: LfgRowOut[];
  applicantsByPost: Record<string, LfgApplicantRow[]>;
  rankClans: RankClanRow[];
  scrimRooms: ScrimRoomRowOut[];
  scrimGuestClans: ScrimGuestClanOption[];
  myClanId: string | null;
  canConfirmScrim: boolean;
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

function scrimStatusLabel(status: ScrimRoomRowOut["status"]): string {
  switch (status) {
    case "draft":
      return "모집 중";
    case "matched":
      return "상대 배정";
    case "confirmed":
      return "일정 확정";
    case "cancelled":
      return "취소";
    case "finished":
      return "종료";
    default:
      return status;
  }
}

function localDatetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MainGameCommunityTabs({
  gameSlug,
  promoSort,
  promos,
  lfgs,
  applicantsByPost,
  rankClans,
  scrimRooms,
  scrimGuestClans,
  myClanId,
  canConfirmScrim,
  canPostPromo,
  canCreateLfg,
  userId,
  clanHubHref,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [promoTitle, setPromoTitle] = useState("");
  const [promoBody, setPromoBody] = useState("");

  const [defaultExp] = useState(() => {
    const d = new Date(Date.now() + 3 * 3600000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [lfgMode, setLfgMode] = useState("경쟁전");
  const [lfgFormat, setLfgFormat] = useState("5vs5");
  const [lfgSlots, setLfgSlots] = useState(2);
  const [lfgHour, setLfgHour] = useState(20);
  const [lfgExp, setLfgExp] = useState(defaultExp);
  const [lfgMic, setLfgMic] = useState(false);
  const [lfgDesc, setLfgDesc] = useState("");

  const [applyMsg, setApplyMsg] = useState<Record<string, string>>({});

  const [scrimTitle, setScrimTitle] = useState("");
  const [scrimPlace, setScrimPlace] = useState("");
  const [scrimWhen, setScrimWhen] = useState(defaultExp);
  const [guestPickByRoom, setGuestPickByRoom] = useState<Record<string, string>>(
    {},
  );

  const [editingScrimId, setEditingScrimId] = useState<string | null>(null);
  const [editScrimTitle, setEditScrimTitle] = useState("");
  const [editScrimPlace, setEditScrimPlace] = useState("");
  const [editScrimWhen, setEditScrimWhen] = useState("");

  const guestCandidates = myClanId
    ? scrimGuestClans.filter((c) => c.id !== myClanId)
    : [];

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

  function submitScrimDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!myClanId) return;
    start(async () => {
      const r = await createDraftScrimRoomAction(gameSlug, myClanId, {
        scheduledAtIso: new Date(scrimWhen).toISOString(),
        title: scrimTitle.trim() || undefined,
        place: scrimPlace.trim() || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("스크림 방을 만들었습니다.");
      setScrimTitle("");
      setScrimPlace("");
      router.refresh();
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

      <TabsContent
        value="promo"
        data-testid="main-game-tab-promo"
        className="space-y-6 text-sm"
      >
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

      <TabsContent
        value="scrim"
        data-testid="main-game-tab-scrim"
        className="space-y-6 text-sm"
      >
        <p className="text-muted-foreground text-xs">
          같은 게임 소속 클랜 간 스크림 방 — 모집 후 상대를 지정하고, 양측 운영진이 확정합니다.
        </p>

        {!myClanId ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-xs">
            스크림은 클랜에 소속된 뒤 이용할 수 있습니다.{" "}
            <Link href={`/games/${g}/clan`} className="text-primary underline-offset-4 hover:underline">
              클랜 온보딩
            </Link>
          </p>
        ) : null}

        {myClanId && canConfirmScrim ? (
          <form
            onSubmit={submitScrimDraft}
            className="bg-card space-y-3 rounded-xl border p-4 shadow-sm"
          >
            <p className="text-xs font-medium">스크림 방 개설 (모집 중)</p>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="제목 (선택)"
              value={scrimTitle}
              disabled={pending}
              onChange={(e) => setScrimTitle(e.target.value)}
            />
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">일시 (로컬)</span>
              <input
                type="datetime-local"
                className="border-input bg-background rounded-md border px-2 py-1.5"
                value={scrimWhen}
                disabled={pending}
                onChange={(e) => setScrimWhen(e.target.value)}
                required
              />
            </label>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="장소 / 채널 (선택)"
              value={scrimPlace}
              disabled={pending}
              onChange={(e) => setScrimPlace(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={pending}>
              방 만들기
            </Button>
          </form>
        ) : myClanId && !canConfirmScrim ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-xs">
            스크림 개설·확정은 클랜에서 허용된 운영 역할만 할 수 있습니다.
          </p>
        ) : null}

        {!scrimRooms.length ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            등록된 스크림이 없습니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {scrimRooms.map((room) => {
              const isHost = myClanId === room.clan_a_id;
              const isGuest =
                room.clan_b_id != null && myClanId === room.clan_b_id;
              const activeScrim =
                room.status === "draft" ||
                room.status === "matched" ||
                room.status === "confirmed";
              const showCancel =
                canConfirmScrim &&
                (isHost || isGuest) &&
                activeScrim;
              const showEditHost =
                canConfirmScrim &&
                isHost &&
                activeScrim;
              const showAttach =
                canConfirmScrim &&
                isHost &&
                room.status === "draft" &&
                room.clan_b_id == null;
              const showConfirmHost =
                canConfirmScrim &&
                isHost &&
                room.status === "matched" &&
                room.clan_b_id != null &&
                !room.host_confirmed;
              const showConfirmGuest =
                canConfirmScrim &&
                isGuest &&
                room.status === "matched" &&
                !room.guest_confirmed;

              const guestPick = guestPickByRoom[room.id] ?? "";
              const isEditing = editingScrimId === room.id;

              return (
                <li
                  key={room.id}
                  className="bg-card rounded-xl border px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {room.title || "스크림"}
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        {new Date(room.scheduled_at).toLocaleString("ko-KR")}
                      </span>
                    </p>
                    <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-medium">
                      {scrimStatusLabel(room.status)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {room.clan_a_name}
                    {room.clan_b_id
                      ? ` ↔ ${room.clan_b_name ?? "상대"}`
                      : " — 상대 미정"}
                  </p>
                  {room.place ? (
                    <p className="text-muted-foreground mt-1 text-xs">{room.place}</p>
                  ) : null}
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    호스트 확정 {room.host_confirmed ? "완료" : "대기"} · 게스트
                    확정 {room.guest_confirmed ? "완료" : "대기"}
                    {room.confirmed_at
                      ? ` · 확정 시각 ${new Date(room.confirmed_at).toLocaleString("ko-KR")}`
                      : ""}
                  </p>

                  {showEditHost || showCancel ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                      {showEditHost ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            if (editingScrimId === room.id) {
                              setEditingScrimId(null);
                            } else {
                              setEditingScrimId(room.id);
                              setEditScrimTitle(room.title ?? "");
                              setEditScrimPlace(room.place ?? "");
                              setEditScrimWhen(localDatetimeInputValue(room.scheduled_at));
                            }
                          }}
                        >
                          {isEditing ? "수정 닫기" : "일정·제목·장소 수정"}
                        </Button>
                      ) : null}
                      {showCancel ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "이 스크림을 취소할까요? 연동된 클랜 일정이 해제됩니다.",
                              )
                            ) {
                              return;
                            }
                            start(async () => {
                              const r = await cancelScrimRoomAction(
                                gameSlug,
                                room.id,
                              );
                              if (!r.ok) {
                                toast.error(r.error);
                                return;
                              }
                              toast.success("스크림을 취소했습니다.");
                              setEditingScrimId((id) =>
                                id === room.id ? null : id,
                              );
                              router.refresh();
                            });
                          }}
                        >
                          스크림 취소
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {showEditHost && isEditing ? (
                    <form
                      className="bg-muted/40 mt-3 space-y-2 rounded-lg border p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!myClanId) return;
                        start(async () => {
                          const r = await updateScrimRoomDetailsAction(
                            gameSlug,
                            room.clan_a_id,
                            room.id,
                            {
                              title: editScrimTitle,
                              place: editScrimPlace,
                              scheduledAtIso: new Date(editScrimWhen).toISOString(),
                            },
                          );
                          if (!r.ok) {
                            toast.error(r.error);
                            return;
                          }
                          toast.success(
                            r.needReconfirm
                              ? "일시·장소를 바꿔 확정을 다시 받아야 합니다."
                              : "스크림 정보를 수정했습니다.",
                          );
                          setEditingScrimId(null);
                          router.refresh();
                        });
                      }}
                    >
                      <p className="text-xs font-medium">수정 내용</p>
                      <input
                        className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
                        placeholder="제목 (비우면 제목 없음)"
                        value={editScrimTitle}
                        disabled={pending}
                        onChange={(e) => setEditScrimTitle(e.target.value)}
                      />
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-muted-foreground">일시 (로컬)</span>
                        <input
                          type="datetime-local"
                          className="border-input bg-background rounded-md border px-2 py-1.5"
                          value={editScrimWhen}
                          disabled={pending}
                          onChange={(e) => setEditScrimWhen(e.target.value)}
                          required
                        />
                      </label>
                      <input
                        className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
                        placeholder="장소 / 채널 (비우면 없음)"
                        value={editScrimPlace}
                        disabled={pending}
                        onChange={(e) => setEditScrimPlace(e.target.value)}
                      />
                      <Button type="submit" size="sm" disabled={pending}>
                        저장
                      </Button>
                    </form>
                  ) : null}

                  {showAttach ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-muted-foreground">상대 클랜</span>
                        <select
                          className="border-input bg-background min-w-[180px] rounded-md border px-2 py-1.5"
                          value={guestPick}
                          disabled={pending || !guestCandidates.length}
                          onChange={(e) =>
                            setGuestPickByRoom((m) => ({
                              ...m,
                              [room.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">선택…</option>
                          {guestCandidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending || !guestPick || !myClanId}
                        onClick={() => {
                          if (!myClanId || !guestPick) return;
                          start(async () => {
                            const r = await attachGuestClanToScrimAction(
                              gameSlug,
                              myClanId,
                              room.id,
                              guestPick,
                            );
                            if (!r.ok) {
                              toast.error(r.error);
                              return;
                            }
                            toast.success("상대 클랜을 배정했습니다.");
                            setGuestPickByRoom((m) => {
                              const next = { ...m };
                              delete next[room.id];
                              return next;
                            });
                            router.refresh();
                          });
                        }}
                      >
                        상대 지정
                      </Button>
                      {!guestCandidates.length ? (
                        <span className="text-muted-foreground text-[11px]">
                          이 게임에 선택할 다른 클랜이 없습니다.
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {showConfirmHost ? (
                    <div className="mt-3 border-t pt-3">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const r = await confirmScrimSideAction(
                              gameSlug,
                              room.id,
                              "host",
                            );
                            if (!r.ok) {
                              toast.error(r.error);
                              return;
                            }
                            toast.success("호스트 측 확정을 기록했습니다.");
                            router.refresh();
                          });
                        }}
                      >
                        우리 측 확정 (호스트)
                      </Button>
                    </div>
                  ) : null}

                  {showConfirmGuest ? (
                    <div className="mt-3 border-t pt-3">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          start(async () => {
                            const r = await confirmScrimSideAction(
                              gameSlug,
                              room.id,
                              "guest",
                            );
                            if (!r.ok) {
                              toast.error(r.error);
                              return;
                            }
                            toast.success("게스트 측 확정을 기록했습니다.");
                            router.refresh();
                          });
                        }}
                      >
                        우리 측 확정 (게스트)
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
