"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactElement } from "react";
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

import type { MainGameCommunityTab } from "@/lib/main-game/main-game-community-tab";

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
  initialTab?: MainGameCommunityTab;
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

/** 로컬 달력 날짜 키 (YYYY-MM-DD) — ISO 시각 문자열 기준 클라이언트 타임존 */
function localDateKeyFromScheduled(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function calendarDayKey(year: number, monthIndex: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function formatScrimDayHeading(dayKey: string): string {
  const [ya, ma, da] = dayKey.split("-").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(ya) || !Number.isFinite(ma) || !Number.isFinite(da)) {
    return dayKey;
  }
  const dt = new Date(ya!, ma! - 1, da);
  return dt.toLocaleDateString("ko-KR", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 상태 칩용 (draft/matched 수 → 모집 중, 확정·종료 → 일정 성사 후) */
type ScrimStatusFilterChip = "all" | "recruiting" | "settled";

const SCRIM_TIER_BAND_KEYS = ["low", "mid", "high"] as const;
type ScrimTierBandKey = (typeof SCRIM_TIER_BAND_KEYS)[number];

/** 티어 범위가 이 SR 구간과 겹치면 통과 — 방에 티어 미표기면 필터 무시 */
const SCRIM_TIER_BANDS: Record<ScrimTierBandKey, readonly [number, number]> = {
  low: [800, 2300],
  mid: [2000, 3400],
  high: [3000, 5000],
};

const SCRIM_TIER_CHIP_META: Record<
  ScrimTierBandKey,
  { label: string; title: string }
> = {
  low: {
    label: "저·중티어 묶음",
    title: "호스트 티어 구간과 약 SR 800~2300 이 겹칠 때(미표기 방은 항상 표시)",
  },
  mid: {
    label: "중위 묶음",
    title: "약 SR 2000~3400 과 겹칠 때(미표기 방은 항상 표시)",
  },
  high: {
    label: "고티어 묶음",
    title: "약 SR 3000 이상 과 겹칠 때 · 최대 5000 스케일(미표기 방은 항상 표시)",
  },
};

function scrimSpansOverlap(region: readonly [number, number], tierMin: number, tierMax: number) {
  const rLo = Math.min(tierMin, tierMax);
  const rHi = Math.max(tierMin, tierMax);
  return Math.max(region[0], rLo) <= Math.min(region[1], rHi);
}

function scrimPassesStatusFilter(room: ScrimRoomRowOut, chip: ScrimStatusFilterChip) {
  switch (chip) {
    case "all":
      return true;
    case "recruiting":
      return room.status === "draft" || room.status === "matched";
    case "settled":
      return room.status === "confirmed" || room.status === "finished";
    default:
      return true;
  }
}

function scrimPassesTierBandFilter(room: ScrimRoomRowOut, bands: ScrimTierBandKey[]) {
  if (!bands.length) return true;
  const tm = room.tier_min;
  const tx = room.tier_max;
  if (tm == null || tx == null) return true;
  return bands.some((k) => scrimSpansOverlap(SCRIM_TIER_BANDS[k], tm, tx));
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
  initialTab = "home",
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
  const [scrimMode, setScrimMode] = useState("5vs5");
  const [scrimTierMin, setScrimTierMin] = useState("");
  const [scrimTierMax, setScrimTierMax] = useState("");
  const [scrimMemo, setScrimMemo] = useState("");
  const [guestPickByRoom, setGuestPickByRoom] = useState<Record<string, string>>(
    {},
  );

  const [editingScrimId, setEditingScrimId] = useState<string | null>(null);
  const [editScrimTitle, setEditScrimTitle] = useState("");
  const [editScrimPlace, setEditScrimPlace] = useState("");
  const [editScrimWhen, setEditScrimWhen] = useState("");
  const [editScrimMode, setEditScrimMode] = useState("");
  const [editScrimTierMin, setEditScrimTierMin] = useState("");
  const [editScrimTierMax, setEditScrimTierMax] = useState("");
  const [editScrimMemo, setEditScrimMemo] = useState("");

  const guestCandidates = myClanId
    ? scrimGuestClans.filter((c) => c.id !== myClanId)
    : [];

  function onPromoSortChange(next: PromoSort) {
    router.push(
      `/games/${encodeURIComponent(gameSlug)}?promoSort=${next === "space" ? "space" : "newest"}`,
    );
  }

  function submitPromo(e: FormEvent) {
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

  function submitLfg(e: FormEvent) {
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

  function submitScrimDraft(e: FormEvent) {
    e.preventDefault();
    if (!myClanId) return;
    start(async () => {
      const t1 = scrimTierMin.trim();
      const t2 = scrimTierMax.trim();
      let tierMin: number | null | undefined;
      let tierMax: number | null | undefined;
      if (t1 || t2) {
        if (!t1 || !t2) {
          toast.error("티어 하한·상한을 함께 입력하거나 둘 다 비우세요.");
          return;
        }
        const a = Number.parseInt(t1, 10);
        const b = Number.parseInt(t2, 10);
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
          toast.error("티어는 정수만 입력하세요.");
          return;
        }
        tierMin = a;
        tierMax = b;
      }
      const r = await createDraftScrimRoomAction(gameSlug, myClanId, {
        scheduledAtIso: new Date(scrimWhen).toISOString(),
        title: scrimTitle.trim() || undefined,
        place: scrimPlace.trim() || undefined,
        mode: scrimMode.trim() || undefined,
        memo: scrimMemo.trim() || undefined,
        tierMin,
        tierMax,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("스크림 방을 만들었습니다.");
      setScrimTitle("");
      setScrimPlace("");
      setScrimMode("5vs5");
      setScrimTierMin("");
      setScrimTierMax("");
      setScrimMemo("");
      router.refresh();
    });
  }

  const [scrimCalendarMonth, setScrimCalendarMonth] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [selectedScrimDayKey, setSelectedScrimDayKey] = useState<string | null>(
    null,
  );
  const [scrimStatusChip, setScrimStatusChip] =
    useState<ScrimStatusFilterChip>("all");
  const [scrimTierBandChip, setScrimTierBandChip] = useState<ScrimTierBandKey[]>(
    [],
  );
  const [scrimShowCancelled, setScrimShowCancelled] = useState(false);

  const filteredScrimRooms = useMemo(() => {
    return scrimRooms.filter((room) => {
      if (!scrimShowCancelled && room.status === "cancelled") return false;
      if (!scrimPassesStatusFilter(room, scrimStatusChip)) return false;
      if (!scrimPassesTierBandFilter(room, scrimTierBandChip)) return false;
      return true;
    });
  }, [scrimRooms, scrimShowCancelled, scrimStatusChip, scrimTierBandChip]);

  const scrimFiltersDirty =
    scrimStatusChip !== "all" ||
    scrimTierBandChip.length > 0 ||
    scrimShowCancelled;

  const scrimsSortedByTime = useMemo(
    () =>
      [...filteredScrimRooms].sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      ),
    [filteredScrimRooms],
  );

  const scrimLocalDayKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of filteredScrimRooms) {
      s.add(localDateKeyFromScheduled(r.scheduled_at));
    }
    return s;
  }, [filteredScrimRooms]);

  const todayLocalKey = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  function shiftScrimCalendarMonth(delta: number) {
    setScrimCalendarMonth(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  const scrimDisplayBuckets = useMemo(() => {
    if (!selectedScrimDayKey) {
      const ordered = [...scrimsSortedByTime];
      const map = new Map<string, ScrimRoomRowOut[]>();
      for (const r of ordered) {
        const k = localDateKeyFromScheduled(r.scheduled_at);
        const prev = map.get(k);
        if (prev) prev.push(r);
        else map.set(k, [r]);
      }
      const keysSorted = [...map.keys()].sort();
      return keysSorted.map((dayKey) => ({ dayKey, rooms: map.get(dayKey)! }));
    }
    const hit = scrimsSortedByTime.filter(
      (r) => localDateKeyFromScheduled(r.scheduled_at) === selectedScrimDayKey,
    );
    return [{ dayKey: selectedScrimDayKey, rooms: hit }];
  }, [scrimsSortedByTime, selectedScrimDayKey]);

  const g = encodeURIComponent(gameSlug);

  return (
    <Tabs defaultValue={initialTab} className="w-full">
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
                  <Link
                    href={`/games/${g}/board/${encodeURIComponent(p.id)}`}
                    className="font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
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
                  <Link
                    href={`/games/${g}/board/${encodeURIComponent(p.id)}`}
                    className="font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
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
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">모드 (선택, 예: 5vs5)</span>
              <input
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={scrimMode}
                disabled={pending}
                onChange={(e) => setScrimMode(e.target.value)}
                maxLength={32}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">티어 하한 (선택)</span>
                <input
                  type="number"
                  className="border-input bg-background w-full rounded-md border px-2 py-1.5"
                  value={scrimTierMin}
                  disabled={pending}
                  onChange={(e) => setScrimTierMin(e.target.value)}
                  min={0}
                  max={5000}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">티어 상한 (선택)</span>
                <input
                  type="number"
                  className="border-input bg-background w-full rounded-md border px-2 py-1.5"
                  value={scrimTierMax}
                  disabled={pending}
                  onChange={(e) => setScrimTierMax(e.target.value)}
                  min={0}
                  max={5000}
                />
              </label>
            </div>
            <textarea
              className="border-input bg-background min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="메모 (선택)"
              value={scrimMemo}
              disabled={pending}
              onChange={(e) => setScrimMemo(e.target.value)}
              maxLength={5000}
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
          <div className="space-y-4">
            <section
              aria-label="스크림 목록 필터"
              data-testid="scrim-filter-bar"
              className="bg-card space-y-4 rounded-xl border p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-medium">상태</span>
                <Button
                  type="button"
                  size="sm"
                  variant={scrimStatusChip === "all" ? "secondary" : "outline"}
                  className="h-8"
                  disabled={pending}
                  onClick={() => setScrimStatusChip("all")}
                >
                  전체
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scrimStatusChip === "recruiting" ? "secondary" : "outline"}
                  className="h-8"
                  disabled={pending}
                  onClick={() => setScrimStatusChip("recruiting")}
                >
                  모집·조율 중
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scrimStatusChip === "settled" ? "secondary" : "outline"}
                  className="h-8"
                  disabled={pending}
                  onClick={() => setScrimStatusChip("settled")}
                >
                  일정 확정·종료
                </Button>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-muted-foreground mt-1.5 shrink-0 font-medium">
                  티어
                </span>
                <div className="flex flex-wrap gap-2">
                  {SCRIM_TIER_BAND_KEYS.map((band) => {
                    const meta = SCRIM_TIER_CHIP_META[band];
                    const on = scrimTierBandChip.includes(band);
                    return (
                      <Button
                        key={band}
                        type="button"
                        size="sm"
                        variant={on ? "secondary" : "outline"}
                        title={meta.title}
                        className="h-8"
                        aria-pressed={on}
                        disabled={pending}
                        onClick={() =>
                          setScrimTierBandChip((prev) =>
                            prev.includes(band)
                              ? prev.filter((b) => b !== band)
                              : [...prev, band],
                          )
                        }
                      >
                        {meta.label}
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      scrimTierBandChip.length === 0 ? "secondary" : "ghost"
                    }
                    className="h-8 px-3"
                    disabled={pending}
                    title="티어 구간 조건 해제"
                    onClick={() => setScrimTierBandChip([])}
                  >
                    티어 조건 해제
                  </Button>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="border-input size-4 shrink-0 rounded border"
                  checked={scrimShowCancelled}
                  disabled={pending}
                  onChange={(e) => setScrimShowCancelled(e.target.checked)}
                />
                취소된 방도 표시
              </label>
              {scrimFiltersDirty ? (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setScrimStatusChip("all");
                      setScrimTierBandChip([]);
                      setScrimShowCancelled(false);
                      setSelectedScrimDayKey(null);
                    }}
                  >
                    필터 초기화
                  </Button>
                  <span className="text-muted-foreground max-w-xl text-[11px] leading-relaxed">
                    티어 칩 여러 개는 OR(한 구간이라도 걸리면 목록 표시).
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  호스트가 티어를 비워 둔 방은 상태만 맞으면 항상 보입니다.
                </p>
              )}
            </section>

            {!filteredScrimRooms.length ? (
              <div className="border-muted-foreground/25 text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                선택한 필터 조건에 맞는 방이 없습니다.
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      setScrimStatusChip("all");
                      setScrimTierBandChip([]);
                      setScrimShowCancelled(false);
                      setSelectedScrimDayKey(null);
                    }}
                  >
                    필터 초기화
                  </Button>
                </div>
              </div>
            ) : (
              <>
            <section
              className="bg-card space-y-3 rounded-xl border p-4 shadow-sm"
              aria-label="스크림이 예정된 날 선택"
              data-testid="scrim-mini-calendar"
            >
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="이전 달"
                  onClick={() => shiftScrimCalendarMonth(-1)}
                >
                  ‹
                </Button>
                <span className="flex-1 text-center text-sm font-medium tabular-nums">
                  {new Date(
                    scrimCalendarMonth.y,
                    scrimCalendarMonth.m,
                  ).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="다음 달"
                  onClick={() => shiftScrimCalendarMonth(1)}
                >
                  ›
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-muted-foreground">
                {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
                  <span key={label} className="block text-center">
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const cy = scrimCalendarMonth.y;
                  const cm = scrimCalendarMonth.m;
                  const padStart = new Date(cy, cm, 1).getDay();
                  const monthLast = new Date(cy, cm + 1, 0).getDate();
                  const el: ReactElement[] = [];
                  for (let i = 0; i < padStart; i += 1) {
                    el.push(
                      <span key={`scrim-cal-pad-${cy}-${cm}-${i}`} className="h-9" />,
                    );
                  }
                  for (let day = 1; day <= monthLast; day += 1) {
                    const dk = calendarDayKey(cy, cm, day);
                    const hasHere = scrimLocalDayKeys.has(dk);
                    const isSelected = selectedScrimDayKey === dk;
                    const isToday = dk === todayLocalKey;
                    el.push(
                      <button
                        key={`scrim-cal-${dk}`}
                        type="button"
                        aria-current={isSelected ? "date" : undefined}
                        aria-pressed={isSelected}
                        aria-label={`${dk} ${hasHere ? "(스크림 있음)" : "(스크림 없음)"}`}
                        disabled={pending}
                        onClick={() =>
                          setSelectedScrimDayKey((prev) => (prev === dk ? null : dk))
                        }
                        className={cn(
                          "h-9 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : hasHere
                              ? "border border-primary/40 bg-muted/60 text-foreground"
                              : "text-muted-foreground hover:bg-muted/50",
                          isToday && !isSelected
                            ? "ring-2 ring-muted-foreground/35 ring-offset-1"
                            : "",
                        )}
                      >
                        {day}
                      </button>,
                    );
                  }
                  return el;
                })()}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedScrimDayKey == null ? "secondary" : "outline"}
                  disabled={pending}
                  onClick={() => setSelectedScrimDayKey(null)}
                >
                  모든 날짜
                </Button>
                <p className="text-muted-foreground text-[11px]">
                  같은 날을 다시 누르면 선택이 해제됩니다.
                </p>
              </div>
            </section>

            <div data-testid="scrimDayList" className="space-y-6">
              {scrimDisplayBuckets.map(({ dayKey, rooms }) =>
                rooms.length ? (
                  <div key={`bucket-${dayKey}`}>
                    {selectedScrimDayKey ? (
                      <p className="text-muted-foreground mb-3 text-[11px]">
                        선택한 날: {formatScrimDayHeading(dayKey)} ·{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {rooms.length}
                        </span>
                        건
                      </p>
                    ) : (
                      <h3 className="border-border mb-3 flex items-baseline justify-between gap-2 border-b pb-2 text-sm font-semibold">
                        <span>{formatScrimDayHeading(dayKey)}</span>
                        <span className="text-muted-foreground text-[11px] font-normal tabular-nums">
                          {rooms.length}건
                        </span>
                      </h3>
                    )}
                    <ul className="space-y-4">
                      {rooms.map((room) => {
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
                  {room.mode ? (
                    <p className="text-muted-foreground mt-1 text-xs">모드 {room.mode}</p>
                  ) : null}
                  {room.tier_min != null && room.tier_max != null ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      티어 범위 {room.tier_min}–{room.tier_max}
                    </p>
                  ) : null}
                  {room.memo ? (
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-xs">
                      {room.memo}
                    </p>
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
                              setEditScrimMode(room.mode ?? "");
                              setEditScrimTierMin(
                                room.tier_min != null ? String(room.tier_min) : "",
                              );
                              setEditScrimTierMax(
                                room.tier_max != null ? String(room.tier_max) : "",
                              );
                              setEditScrimMemo(room.memo ?? "");
                            }
                          }}
                        >
                          {isEditing ? "수정 닫기" : "일정·조건 수정"}
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
                              mode: editScrimMode,
                              memo: editScrimMemo,
                              tierMin: editScrimTierMin,
                              tierMax: editScrimTierMax,
                            },
                          );
                          if (!r.ok) {
                            toast.error(r.error);
                            return;
                          }
                          toast.success(
                            r.needReconfirm
                              ? "일시·장소·모드·티어 범위를 바꿔 확정을 다시 받아야 합니다."
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
                      <label className="space-y-1 text-xs">
                        <span className="text-muted-foreground">모드 (비우면 없음)</span>
                        <input
                          className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
                          value={editScrimMode}
                          disabled={pending}
                          onChange={(e) => setEditScrimMode(e.target.value)}
                          maxLength={32}
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">티어 하한</span>
                          <input
                            type="number"
                            className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
                            value={editScrimTierMin}
                            disabled={pending}
                            onChange={(e) => setEditScrimTierMin(e.target.value)}
                            min={0}
                            max={5000}
                          />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">티어 상한</span>
                          <input
                            type="number"
                            className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-xs"
                            value={editScrimTierMax}
                            disabled={pending}
                            onChange={(e) => setEditScrimTierMax(e.target.value)}
                            min={0}
                            max={5000}
                          />
                        </label>
                      </div>
                      <textarea
                        className="border-input bg-background min-h-[64px] w-full rounded-md border px-2 py-1.5 text-xs"
                        placeholder="메모 (비우면 없음)"
                        value={editScrimMemo}
                        disabled={pending}
                        onChange={(e) => setEditScrimMemo(e.target.value)}
                        maxLength={5000}
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
                  </div>
                ) : (
                  <div
                    key={`bucket-${dayKey}-empty`}
                    className="border-muted-foreground/30 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
                  >
                    <p>선택한 날짜에 표시할 스크림이 없습니다.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled={pending}
                      onClick={() => setSelectedScrimDayKey(null)}
                    >
                      모든 날짜 보기
                    </Button>
                  </div>
                ),
              )}
            </div>
              </>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
