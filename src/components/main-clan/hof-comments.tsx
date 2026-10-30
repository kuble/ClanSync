"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { addHofCommentAction, deleteHofCommentAction, listHofCommentsAction, listHofCommentReactionPeopleAction, setHofCommentReactionAction } from "@/app/actions/hof-comments";
import { HOF_COMMENT_MAX_LENGTH, type HofComment, type HofCommentThread, type HofReactionKind } from "@/lib/clan/stats/hof-comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsScrollArea } from "./stats-scroll-area";
import { ClanCommentComposer, ClanComments } from "./clan-comments";

/** Preserve the card and controls; only a thread's draft/replies reset on a scope change. */
export function HofComments({ clanId, ranking, periodKey, label }: HofCommentThread & { label: string }) {
  const key = clanId + ":" + ranking + ":" + periodKey;
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<{ key: string; loading: boolean; busy: boolean }>();
  const onStatus = useCallback((loading: boolean, busy: boolean) => setStatus({ key, loading, busy }), [key]);
  const disabled = status?.key !== key || status.loading || status.busy;
  return <HofCommentsCard label={label} disabled={disabled} onRefresh={() => setRefresh(value => value + 1)}>
    <HofCommentsThread key={key} clanId={clanId} ranking={ranking} periodKey={periodKey} refresh={refresh} onStatus={onStatus} />
  </HofCommentsCard>;
}

export function HofCommentsCard({ label, disabled, onRefresh, children }: { label: string; disabled: boolean; onRefresh: () => void; children: ReactNode }) {
  return <Card size="sm" className="h-[36rem] min-w-0 overflow-hidden" aria-label={label + " 반응"}>
    <CardHeader className="grid-cols-[1fr_auto] items-center border-b pb-3">
      <CardTitle><h4 className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" aria-hidden="true" />반응</h4></CardTitle>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="반응 새로고침" disabled={disabled} onClick={onRefresh}><RefreshCw className="size-3.5" aria-hidden="true" /></Button>
    </CardHeader>
    {children}
  </Card>;
}

function HofCommentsThread({ clanId, ranking, periodKey, refresh, onStatus }: HofCommentThread & { refresh: number; onStatus: (loading: boolean, busy: boolean) => void }) {
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
    if (loading || !el || !update) return;
    el.scrollTop = update === "latest" ? el.scrollHeight : update.top + el.scrollHeight - update.height;
    scrollUpdate.current = null;
  }, [comments, loading]);

  useEffect(() => { onStatus(loading, busy); }, [loading, busy, onStatus]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
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
    <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <StatsScrollArea label="순위 댓글 목록" className="min-h-0 flex-1" viewportRef={viewport}>
        {loading ? <p role="status" className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">반응을 불러오는 중…</p> : <>
        {cursor && <Button type="button" className="w-full" variant="outline" size="sm" disabled={busy} onClick={() => void loadMore()}>이전 댓글 더 보기</Button>}
        {comments.length ? <ClanComments comments={chronological} clanId={clanId} targetKind="hof_comment" disabled={busy || loading} onDelete={comment => remove(comment.id)} onReact={react} loadReactionPeople={(comment, reaction) => listHofCommentReactionPeopleAction(thread, comment.id, reaction)} /> : !error && <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center"><MessageSquare className="size-8 text-primary/50" aria-hidden="true" /><p className="text-sm font-semibold">이번 순위에 대한 의견을 남길 수 있습니다.</p><p className="text-xs text-muted-foreground">아직 등록된 댓글이 없습니다. 첫 댓글을 남겨 주십시오.</p></div>}
        </>}
      </StatsScrollArea>
      <ClanCommentComposer pickerLabel="댓글 이모티콘 선택" id="hof-comment" label="순위 보고 한마디" value={draft} onChange={setDraft} onSubmit={submit} maxLength={HOF_COMMENT_MAX_LENGTH} disabled={busy} submitDisabled={loading} placeholder="이번 순위에 한마디 남겨보십시오." />
    </CardContent>
  );
}
