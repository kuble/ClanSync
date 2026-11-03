"use client";
import { useTranslator } from "#use-translator";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronRight, Clock3, Compass, Shield, Star, Trophy } from "lucide-react";
import { setClanFavorite } from "@/app/actions/clan-favorites";
import { toast } from "sonner";
import { replacePendingJoinRequestAction, submitClanJoinRequestAction } from "@/app/actions/game-clan-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import styles from "./clan-discovery.module.css";
import onboarding from "./onboarding.module.css";
import { CLAN_STYLES, recruitmentTierSummary, recruitmentYearLabel } from "@/lib/clan/recruitment";
import { InquiryButton } from "@/components/onboarding/inquiry-button";
import type { PromotionPost } from "@/lib/clan/promotion";
import { ClanPromotionDialogContent } from "./clan-promotion-dialog-content";

export type ClanListRow = {
  id: string; name: string; icon_url?: string | null; description: string | null; max_members: number;
  active_members?: number | null; rules?: string | null; style?: string | null; tier_range?: string[]; recruitment_positions?: string[];
  created_at?: string; subscription_tier?: string;
  birth_year_from?: number | null; min_birth_year?: number | null; gender_policy?: "all" | "male" | "female";
  isFavorite?: boolean;
  promotion?: PromotionPost | null;
};
const STYLE_LABEL: Record<string, string> = Object.fromEntries(CLAN_STYLES.map(({value, label}) => [value, label]));

export function ClanJoinList({ gameSlug, clans, pendingClanId = null, blockingClanName = null, pinnedPendingClan = null, initialDetails = null, canApply = true,
  pendingActions, filters, listingFailed, pagination, createContent }: {
  gameSlug: string; clans: ClanListRow[]; pendingClanId?: string | null; blockingClanName?: string | null; pinnedPendingClan?: ClanListRow | null; initialDetails?: ClanListRow | null; canApply?: boolean;
  pendingActions: ReactNode; filters: ReactNode; listingFailed: boolean; pagination: ReactNode; createContent: ReactNode;
}) {
  const tx = useTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = pendingClanId && searchParams.get("inquiry") === pendingClanId ? "pending"
    : requestedTab === "join" || requestedTab === "create" ? requestedTab
    : pendingClanId ? "pending" : "join";
  function changeTab(value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  }
  const [savedFavorites, setSavedFavorites] = useState<Record<string,boolean>>({});
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [selected, setSelected] = useState<ClanListRow | null>(null);
  const [details, setDetails] = useState<ClanListRow | null>(initialDetails);
  const [blockName, setBlockName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const effectivePendingId = sentId ?? pendingClanId;

  function closeDetails() {
    setDetails(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("promotion")) {
      url.searchParams.delete("promotion");
      window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
    }
  }
  function openApply(clan: ClanListRow) {
    if (!canApply) return;
    setSelected(clan); setError(null);
    if (effectivePendingId && effectivePendingId !== clan.id) {
      setBlockName(blockingClanName ?? selected?.name ?? "다른 클랜");
      setReplaceOpen(true);
    } else setReplaceOpen(false);
  }
  async function runSubmit(replace: boolean) {
    if (!selected || busy || !canApply) return;
    setBusy(true); setError(null);
    try {
      const result = replace ? await replacePendingJoinRequestAction(gameSlug, selected.id) : await submitClanJoinRequestAction(gameSlug, selected.id);
      if (result.ok) {
        setSentId(selected.id); setSelected(null); setReplaceOpen(false);
        changeTab("pending");
        toast.success(replace ? "기존 신청을 취소하고 새로 신청했습니다." : "가입 신청을 보냈습니다.", { duration: 4800 });
        router.refresh();
      } else if (result.error.startsWith("PENDING_ELSEWHERE:")) {
        setBlockName(result.error.slice("PENDING_ELSEWHERE:".length)); setReplaceOpen(true);
      } else { setError(result.error); toast.error(result.error); }
    } catch {
      setError("가입 신청을 보내지 못했습니다. 잠시 후 다시 시도해 주십시오.");
    } finally { setBusy(false); }
  }

  function renderFavorite(clan: ClanListRow) {
    const isFavorite = savedFavorites[clan.id] ?? !!clan.isFavorite;
    return <Button type="button" variant="ghost" size="icon-sm" aria-label={clan.name + " 즐겨찾기"} aria-pressed={isFavorite} title={isFavorite ? tx("즐겨찾기 해제") : tx("즐겨찾기 추가")} disabled={savingFavorite}
      onClick={async () => {
        setSavingFavorite(true);
        try {
          if (!await setClanFavorite(clan.id, !isFavorite)) throw new Error();
          setSavedFavorites(previous => ({ ...previous, [clan.id]: !isFavorite }));
          router.refresh();
        } catch {
          toast.error("즐겨찾기를 저장하지 못했습니다. 다시 시도해 주세요.");
        } finally {
          setSavingFavorite(false);
        }
      }}>
      <Star aria-hidden className={isFavorite ? "fill-primary text-primary" : "text-muted-foreground"} />
    </Button>;
  }

  function renderCard(clan: ClanListRow, pinned = false) {
    const isPending = effectivePendingId === clan.id;
    return <article className={styles.clanCard} data-pending-card={pinned || undefined}>
      <div className={styles.overview}>
        <span className={styles.miniEmblem} aria-hidden>
          {clan.icon_url ? <Image src={clan.icon_url} alt="" width={56} height={56} unoptimized /> : <Shield size={24} />}
        </span>
        <span className={styles.clanText}>
          <span className={styles.clanIdentity}>
            <button type="button" className={styles.detailTrigger} data-testid={`clan-details-${clan.id}`} onClick={() => setDetails(clan)} aria-haspopup="dialog" aria-label={tx("{0} 클랜 상세 보기", clan.name)}><strong>{clan.name}</strong></button>
            {renderFavorite(clan)}
            {isPending && (
              <Badge variant="outline" data-testid={pinned ? "clan-join-pinned-pending-badge" : `clan-join-pending-${clan.id}`}>
                <Clock3 size={12} aria-hidden />{tx("신청 대기 중")}
              </Badge>
            )}
          </span>
          <span className={styles.cardTags}>
            <span data-style={clan.style || undefined}><Compass size={12} aria-hidden /><span className="sr-only">{tx("클랜 지향")} </span>{clan.style ? STYLE_LABEL[clan.style] ?? clan.style : tx("무관")}</span>
            <span><CalendarDays size={12} aria-hidden />{recruitmentYearLabel({birth_year_from:clan.birth_year_from ?? null,min_birth_year:clan.min_birth_year ?? null})}</span>
            <span><Trophy size={12} aria-hidden />{recruitmentTierSummary(gameSlug, clan.tier_range ?? [])}</span>
          </span>
        </span>
        <ChevronRight size={16} aria-hidden className={styles.detailArrow} />
      </div>
      {pinned && <div className={styles.pendingActions}>{pendingActions}</div>}
    </article>;
  }

  return <Tabs value={activeTab} onValueChange={value => { if (typeof value === "string") changeTab(value); }} className={`${onboarding.tabs} ${styles.tabs}`}>
    <TabsList variant="line" className={styles.tabList}>
      {pendingClanId && <TabsTrigger value="pending">{tx("가입 대기")}</TabsTrigger>}
      <TabsTrigger value="join">{tx("클랜 가입")}</TabsTrigger>
      <TabsTrigger value="create">{tx("클랜 생성")}</TabsTrigger>
    </TabsList>
    {pendingClanId && <TabsContent value="pending"><section aria-label={tx("현재 신청 중인 클랜")} data-testid="clan-join-pinned-pending-section">
      {pinnedPendingClan ? renderCard(pinnedPendingClan, true) : <article className={styles.clanCard} data-pending-card>
        <div className="flex flex-wrap items-center gap-2"><strong>{blockingClanName || tx("클랜")}</strong><Badge variant="outline"><Clock3 aria-hidden />{tx("신청 대기 중")}</Badge></div>
        <div className={styles.pendingActions}>{pendingActions}</div>
      </article>}
    </section></TabsContent>}
    <TabsContent value="join">
      <div className={styles.directory}>
        {filters}
        <section className={styles.results} aria-label={tx("클랜 검색 결과")}>
          {listingFailed ? <p role="alert" className={onboarding.error}>{tx("클랜 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주십시오.")}</p> : <>
            {clans.length ? <ul className={styles.clanList}>{clans.map(clan => <li key={clan.id}>{renderCard(clan)}</li>)}</ul>
              : <p className={styles.empty}>{pendingClanId ? tx("검색 결과에 다른 클랜이 없습니다. 검색어와 필터를 바꿔 보십시오.") : tx("조건에 맞는 클랜이 없습니다. 검색어를 바꾸거나 새 클랜을 만들어 보십시오.")}</p>}
            {pagination}
          </>}
        </section>
      </div>
    </TabsContent>
    <TabsContent value="create">{createContent}</TabsContent>
    <Dialog open={selected != null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
      {selected && <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{replaceOpen ? tx("진행 중인 신청이 있습니다") : selected.name + " 가입 신청"}</DialogTitle>
          <DialogDescription>{replaceOpen ? tx("현재 「{0}」에 가입 신청 중입니다. 취소하고 「{1}」에 새로 신청하시겠습니까?", blockName, selected.name) : tx("「{0}」에 가입 신청하시겠습니까?", selected.name)}</DialogDescription>
        </DialogHeader>
        {error && <p className={styles.error} role="alert">{tx(error)}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>{replaceOpen ? tx("아니오") : tx("취소")}</Button>
          <Button type="button" disabled={busy} data-testid={`clan-join-send-${selected.id}`} onClick={() => void runSubmit(replaceOpen)}>{busy ? tx("신청 중…") : replaceOpen ? tx("취소 후 새로 신청") : tx("가입 신청")}</Button>
        </DialogFooter>
      </DialogContent>}
    </Dialog>
    <Dialog open={details != null} onOpenChange={(open) => { if (!open) closeDetails(); }}>
      {details && <ClanPromotionDialogContent gameSlug={gameSlug} clan={details} favorite={renderFavorite(details)}
        onClose={closeDetails} action={<>
          {effectivePendingId === details.id && <InquiryButton clanId={details.id} />}
          {canApply && <Button type="button" aria-haspopup="dialog" data-testid={`clan-join-open-${details.id}`}
            disabled={busy || effectivePendingId === details.id || (details.active_members != null && details.active_members >= details.max_members)}
            onClick={() => { closeDetails(); openApply(details); }}>
            {effectivePendingId === details.id ? tx("신청 대기 중") : details.active_members != null && details.active_members >= details.max_members ? tx("정원 마감") : tx("가입 신청")}
          </Button>}
        </>} />}
    </Dialog>
  </Tabs>;
}
