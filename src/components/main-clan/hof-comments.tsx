"use client";

import { useTranslator } from "#use-translator";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { addHofCommentAction, deleteHofCommentAction, listHofCommentsAction, listHofCommentReactionPeopleAction, setHofCommentReactionAction } from "@/app/actions/hof-comments";
import { HOF_COMMENT_MAX_LENGTH, type HofComment, type HofCommentThread, type HofReactionKind } from "@/lib/clan/stats/hof-comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsScrollArea } from "./stats-scroll-area";
import { ClanCommentComposer, ClanComments } from "./clan-comments";
import { ClanCommentsDrawer } from "./clan-comments-drawer";
import { useStatsDrawerLayout } from "./stats-side-panel";

type DrawerProps = { drawerOpen?: boolean; onDrawerOpenChange?: (open: boolean) => void };

/** Preserve the card and controls; only a thread's draft/replies reset on a scope change. */
export function HofComments(props: HofCommentThread & { label: string } & DrawerProps) {
  const { clanId, ranking, periodKey } = props;
  const key = clanId + ":" + ranking + ":" + periodKey;
  return <HofCommentsThread key={key} {...props} />;
}

export function HofCommentsCard({ label, disabled, onRefresh, children, drawerOpen = false, onDrawerOpenChange }: { label: string; disabled: boolean; onRefresh: () => void; children: ReactNode } & DrawerProps) {
  const tx = useTranslator();
  const narrow = useStatsDrawerLayout();
  const refreshButton = <Button type="button" variant="ghost" size="icon-sm" aria-label={tx("반응 새로고침")} disabled={disabled} onClick={onRefresh}><RefreshCw className="size-3.5" aria-hidden="true" /></Button>;
  if (narrow) return <ClanCommentsDrawer open={drawerOpen} onOpenChange={onDrawerOpenChange} title={tx("반응")} label={tx(label)} action={refreshButton}>{children}</ClanCommentsDrawer>;
  return <Card size="sm" className="hidden min-h-0 min-w-0 overflow-hidden min-[1000px]:flex" aria-label={label + " 반응"}>
    <CardHeader className="grid-cols-[1fr_auto] items-center border-b pb-3">
      <CardTitle><h4 className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" aria-hidden="true" />{tx("반응")}</h4></CardTitle>
      {refreshButton}
    </CardHeader>
    {children}
  </Card>;
}

function HofCommentsThread({ clanId, ranking, periodKey, label, drawerOpen, onDrawerOpenChange }: HofCommentThread & { label: string } & DrawerProps) {
  const tx = useTranslator();
  const [refresh, setRefresh] = useState(0);
  const [comments, setComments] = useState<HofComment[]>([]);
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  const scrollUpdate = useRef<"latest" | { height: number; top: number } | null>("latest");
  const thread = { clanId, ranking, periodKey };

  useLayoutEffect(() => {
    const el = viewport.current;
    const update = scrollUpdate.current;
    if (loading || !el || !update || !el.getClientRects().length) return;
    el.scrollTop = update === "latest" ? el.scrollHeight : update.top + el.scrollHeight - update.height;
    scrollUpdate.current = null;
  }, [comments, loading, drawerOpen]);

  useEffect(() => {
    let active = true;
    listHofCommentsAction({ clanId, ranking, periodKey }).then((result) => {
      if (!active) return;
      if (result.ok) { scrollUpdate.current = "latest"; setComments(result.comments); setCursor(result.nextCursor); }
      else setError(result.error);
    }).catch(() => { if (active) setError("반응을 불러오지 못했습니다. 다시 시도해 주십시오."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clanId, ranking, periodKey, refresh]);

  async function submit() {
    if (busy || loading || !draft.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await addHofCommentAction(thread, draft);
      if (result.ok) { scrollUpdate.current = "latest"; setComments((rows) => [result.comment, ...rows]); setDraft(""); }
      else setError(result.error);
    } catch { setError("등록 결과를 확인하지 못했습니다. 새로고침으로 확인해 주십시오."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy || loading) return;
    setBusy(true); setError("");
    try {
      const result = await deleteHofCommentAction(thread, id);
      if (result.ok) setComments((rows) => rows.filter((row) => row.id !== id));
      else setError(result.error);
    } catch { setError("삭제 결과를 확인하지 못했습니다. 새로고침으로 확인해 주십시오."); }
    finally { setBusy(false); }
  }

  async function react(comment: HofComment, kind: HofReactionKind | null) {
    if (busy || loading) return;
    setBusy(true); setError("");
    try {
      const result = await setHofCommentReactionAction(thread, comment.id, kind);
      if (result.ok) setComments((rows) => rows.map((row) => row.id === comment.id ? { ...row, reactions: result.reactions } : row));
      else setError(result.error);
    } catch { setError("공감 결과를 확인하지 못했습니다. 새로고침으로 확인해 주십시오."); }
    finally { setBusy(false); }
  }


  async function loadMore() {
    if (busy || loading || !cursor) return;
    setBusy(true); setError("");
    try {
      const result = await listHofCommentsAction(thread, cursor);
      if (result.ok) {
        if (viewport.current) scrollUpdate.current = { height: viewport.current.scrollHeight, top: viewport.current.scrollTop };
        setComments((rows) => [...rows, ...result.comments.filter((item) => !rows.some((row) => row.id === item.id))]);
        setCursor(result.nextCursor);
      } else setError(result.error);
    } catch { setError("이전 댓글을 불러오지 못했습니다. 다시 시도해 주십시오."); }
    finally { setBusy(false); }
  }

  const chronological = [...comments].reverse();

  return (
    <HofCommentsCard label={tx(label)} disabled={loading || busy} onRefresh={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} drawerOpen={drawerOpen} onDrawerOpenChange={onDrawerOpenChange}>
    <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{tx(error)}</p>}
      <StatsScrollArea label={tx(ranking === "prediction" ? "적중률 댓글 목록" : "순위 댓글 목록")} className="min-h-0 flex-1" viewportRef={viewport}>
        {loading ? <p role="status" className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">{tx("반응을 불러오는 중…")}</p> : <>
        {cursor && <Button type="button" className="w-full" variant="outline" size="sm" disabled={busy} onClick={() => void loadMore()}>{tx("이전 댓글 더 보기")}</Button>}
        {comments.length ? <ClanComments comments={chronological} clanId={clanId} targetKind="hof_comment" disabled={busy || loading} onDelete={comment => remove(comment.id)} onReact={react} loadReactionPeople={(comment, reaction) => listHofCommentReactionPeopleAction(thread, comment.id, reaction)} /> : !error && <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center"><MessageSquare className="size-8 text-primary/50" aria-hidden="true" /><p className="text-sm font-semibold">{tx(ranking === "prediction" ? "이번 예측 결과에 대한 의견을 남길 수 있습니다." : "이번 순위에 대한 의견을 남길 수 있습니다.")}</p><p className="text-xs text-muted-foreground">{tx("아직 등록된 댓글이 없습니다. 첫 댓글을 남겨 주십시오.")}</p></div>}
        </>}
      </StatsScrollArea>
      <ClanCommentComposer pickerLabel="댓글 이모티콘 선택" id="hof-comment" label={tx(ranking === "prediction" ? "예측 결과 보고 한마디" : "순위 보고 한마디")} value={draft} onChange={setDraft} onSubmit={submit} maxLength={HOF_COMMENT_MAX_LENGTH} disabled={busy} submitDisabled={loading} placeholder={tx(ranking === "prediction" ? "이번 예측 결과에 한마디 남겨보십시오." : "이번 순위에 한마디 남겨보십시오.")} />
    </CardContent>
    </HofCommentsCard>
  );
}
