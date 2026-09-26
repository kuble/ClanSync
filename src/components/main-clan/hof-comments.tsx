"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { addHofCommentAction, deleteHofCommentAction, listHofCommentsAction } from "@/app/actions/hof-comments";
import { HOF_COMMENT_MAX_LENGTH, type HofComment, type HofCommentThread } from "@/lib/clan/stats/hof-comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsScrollArea } from "./stats-scroll-area";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** The parent keys this component by thread, isolating drafts and in-flight replies. */
export function HofComments({ clanId, ranking, periodKey, label }: HofCommentThread & { label: string }) {
  const [comments, setComments] = useState<HofComment[]>([]);
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const thread = { clanId, ranking, periodKey };

  useEffect(() => {
    let active = true;
    listHofCommentsAction({ clanId, ranking, periodKey }).then((result) => {
      if (!active) return;
      if (result.ok) { setComments(result.comments); setCursor(result.nextCursor); }
      else setError(result.error);
    }).catch(() => { if (active) setError("반응을 불러오지 못했습니다. 다시 시도해 주세요."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clanId, ranking, periodKey, refresh]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || loading || !draft.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await addHofCommentAction(thread, draft);
      if (result.ok) { setComments((rows) => [result.comment, ...rows]); setDraft(""); }
      else setError(result.error);
    } catch { setError("등록 결과를 확인하지 못했습니다. 새로고침으로 확인해 주세요."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy || loading) return;
    setBusy(true); setError("");
    try {
      const result = await deleteHofCommentAction(thread, id);
      if (result.ok) { setComments((rows) => rows.filter((row) => row.id !== id)); setConfirmDelete(null); }
      else setError(result.error);
    } catch { setError("삭제 결과를 확인하지 못했습니다. 새로고침으로 확인해 주세요."); }
    finally { setBusy(false); }
  }

  async function loadMore() {
    if (busy || loading || !cursor) return;
    setBusy(true); setError("");
    try {
      const result = await listHofCommentsAction(thread, cursor);
      if (result.ok) {
        setComments((rows) => [...rows, ...result.comments.filter((item) => !rows.some((row) => row.id === item.id))]);
        setCursor(result.nextCursor);
      } else setError(result.error);
    } catch { setError("이전 댓글을 불러오지 못했습니다. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }

  return <Card size="sm" className="min-w-0" aria-label={`${label} 반응`}>
    <CardHeader className="grid-cols-[1fr_auto] items-center">
      <CardTitle><h4 className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" aria-hidden="true" />반응</h4></CardTitle>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="반응 새로고침" disabled={busy || loading} onClick={() => { setError(""); setLoading(true); setRefresh((value) => value + 1); }}><RefreshCw className="size-3.5" aria-hidden="true" /></Button>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="hof-comment" className="sr-only">순위에 댓글 남기기</label>
        <textarea id="hof-comment" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={HOF_COMMENT_MAX_LENGTH} rows={3} placeholder="이번 순위에 응원이나 한마디를 남겨보세요." className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary" disabled={busy} />
        <div className="flex items-center justify-between gap-2"><span className="text-xs tabular-nums text-muted-foreground">{draft.length} / {HOF_COMMENT_MAX_LENGTH}</span><Button type="submit" size="sm" disabled={busy || loading || !draft.trim()}>댓글 등록</Button></div>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p role="status" className="py-6 text-center text-sm text-muted-foreground">반응을 불러오는 중…</p> : <>
        <StatsScrollArea label="순위 댓글 목록" className="max-h-[22rem]">
          {comments.length ? <ol className="divide-y">{comments.map((comment) => <li key={comment.id} className="space-y-2 py-3 first:pt-0">
            <div className="flex items-center gap-2 text-xs"><strong className="min-w-0 flex-1 truncate text-sm">{comment.nickname}</strong><time dateTime={comment.createdAt} className="shrink-0 text-muted-foreground">{dateFormat.format(new Date(comment.createdAt))}</time>{comment.canDelete && <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" disabled={busy} aria-label={`${comment.nickname} 댓글 삭제`} onClick={() => setConfirmDelete(comment.id)}>삭제</button>}</div>
            <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{comment.content}</p>
            {confirmDelete === comment.id && <div className="flex flex-wrap items-center gap-2 text-xs"><span>이 댓글을 삭제할까요?</span><Button type="button" size="xs" variant="destructive" disabled={busy} onClick={() => void remove(comment.id)}>삭제 확인</Button><Button type="button" size="xs" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(null)}>취소</Button></div>}
          </li>)}</ol> : !error && <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">아직 반응이 없어요.<br />첫 응원을 남겨보세요.</p>}
          {cursor && <Button type="button" className="mt-3 w-full" variant="outline" size="sm" disabled={busy} onClick={() => void loadMore()}>이전 댓글 더 보기</Button>}
        </StatsScrollArea>
      </>}
    </CardContent>
  </Card>;
}
