"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageSquare, RefreshCw, Send, Trash2 } from "lucide-react";
import { addHofCommentAction, deleteHofCommentAction, listHofCommentsAction, listHofCommentReactionPeopleAction, setHofCommentReactionAction } from "@/app/actions/hof-comments";
import { HOF_COMMENT_MAX_LENGTH, HOF_REACTIONS, type HofComment, type HofCommentThread, type HofReactionKind } from "@/lib/clan/stats/hof-comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsScrollArea } from "./stats-scroll-area";
import { ClanEmojiInput, ClanEmojiText } from "./clan-emoji-content";
import { ClanEmojiReactions, EmojiReactionButton } from "./clan-emoji-reactions";
import { ClanPlayerAvatar } from "@/components/profile/clan-namecards";
import styles from "./clan-comment.module.css";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" });
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
const reactionOptions = HOF_REACTIONS.map((option) => ({ ...option, value: option.kind }));

/** Preserve the card and controls; only a thread's draft/replies reset on a scope change. */
export function HofComments({ clanId, ranking, periodKey, label }: HofCommentThread & { label: string }) {
  const key = clanId + ":" + ranking + ":" + periodKey;
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<{ key: string; loading: boolean; busy: boolean }>();
  const onStatus = useCallback((loading: boolean, busy: boolean) => setStatus({ key, loading, busy }), [key]);
  const disabled = status?.key !== key || status.loading || status.busy;
  return <Card size="sm" className="h-[36rem] min-w-0 overflow-hidden" aria-label={label + " 반응"}>
    <CardHeader className="grid-cols-[1fr_auto] items-center border-b pb-3">
      <CardTitle><h4 className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" aria-hidden="true" />반응</h4></CardTitle>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="반응 새로고침" disabled={disabled} onClick={() => setRefresh((value) => value + 1)}><RefreshCw className="size-3.5" aria-hidden="true" /></Button>
    </CardHeader>
    <HofCommentsThread key={key} clanId={clanId} ranking={ranking} periodKey={periodKey} refresh={refresh} onStatus={onStatus} />
  </Card>;
}

function HofCommentsThread({ clanId, ranking, periodKey, refresh, onStatus }: HofCommentThread & { refresh: number; onStatus: (loading: boolean, busy: boolean) => void }) {
  const [comments, setComments] = useState<HofComment[]>([]);
  const [cursor, setCursor] = useState<{ createdAt: string; id: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const input = useRef<HTMLDivElement>(null);
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
      if (result.ok) { scrollUpdate.current = "latest"; setComments((rows) => [result.comment, ...rows]); setDraft(""); }
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

  async function react(comment: HofComment, kind: HofReactionKind) {
    if (busy || loading) return;
    setBusy(true); setError("");
    try {
      const mine = comment.reactions.some((reaction) => reaction.kind === kind && reaction.mine);
      const result = await setHofCommentReactionAction(thread, comment.id, mine ? null : kind);
      if (result.ok) setComments((rows) => rows.map((row) => row.id === comment.id ? { ...row, reactions: result.reactions } : row));
      else setError(result.error);
    } catch { setError("공감 결과를 확인하지 못했습니다. 새로고침으로 확인해 주세요."); }
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
    } catch { setError("이전 댓글을 불러오지 못했습니다. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }

  const chronological = [...comments].reverse().map(comment => ({ comment, day: dateFormat.format(new Date(comment.createdAt)) }));

  return (
    <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <StatsScrollArea label="순위 댓글 목록" className="min-h-0 flex-1" viewportRef={viewport}>
        {loading ? <p role="status" className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">반응을 불러오는 중…</p> : <>
        {cursor && <Button type="button" className="w-full" variant="outline" size="sm" disabled={busy} onClick={() => void loadMore()}>이전 댓글 더 보기</Button>}
        {comments.length ? <ol className="space-y-5">{chronological.map(({ comment, day }, index) => <li key={comment.id} className="space-y-3">
          {(index === 0 || chronological[index - 1].day !== day) && <div role="separator" aria-label={day} className="flex items-center gap-3 py-1 text-[10px] text-muted-foreground"><span className="h-px flex-1 bg-border"/><span>{day}</span><span className="h-px flex-1 bg-border"/></div>}
          <div data-comment-row className={`${styles.comment} flex items-start gap-2.5 ${comment.isMine ? "flex-row-reverse" : ""}`}>
          <ClanPlayerAvatar userId={comment.authorId} label={comment.nickname}/>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className={`flex ${comment.isMine ? "justify-end" : ""}`}><strong className="max-w-full truncate text-xs">{comment.nickname}</strong></div>
            <div className={`${styles.message} ${comment.isMine ? styles.mine : ""}`}>
            <div className={styles.bubble}>
            <p className={`w-fit whitespace-pre-wrap break-words rounded-xl border px-3 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${comment.isMine ? "ml-auto rounded-tr-sm border-primary/25 bg-primary/15" : "rounded-tl-sm bg-background/50"}`}><ClanEmojiText text={comment.content}/></p>
            <time dateTime={comment.createdAt} title={`${day} ${timeFormat.format(new Date(comment.createdAt))}`} className={styles.time}>{timeFormat.format(new Date(comment.createdAt))}</time>
            </div>
            <div className={styles.reactions} aria-label={`${comment.nickname} 댓글 공감`}>
              {HOF_REACTIONS.map((option) => {
                const reaction = comment.reactions.find(({ kind }) => kind === option.kind);
                return reaction && <EmojiReactionButton key={option.kind} count={reaction.count} aria-pressed={reaction.mine} disabled={busy || loading}
                  aria-label={`${option.label} 공감 ${reaction.count}명`} title={`${option.label}${reaction.mine ? " 취소" : ""}`}
                  loadPeople={() => listHofCommentReactionPeopleAction(thread, comment.id, { kind: option.kind })}
                  onClick={() => void react(comment, option.kind)}>{option.emoji}</EmojiReactionButton>;
              })}
              <ClanEmojiReactions pickerLabel={`${comment.nickname} 댓글 공감 선택`} clanId={clanId} target={{kind:"hof_comment",id:comment.id}} reactions={comment.emojiReactions??[]} standardOptions={reactionOptions} onStandardSelect={value=>{const option=HOF_REACTIONS.find(row=>row.kind===value);if(option)void react(comment,option.kind);}} loadPeople={emojiId => listHofCommentReactionPeopleAction(thread, comment.id, { emojiId })}/>
              {comment.canDelete && <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" disabled={busy} aria-label={`${comment.nickname} 댓글 삭제`} title="댓글 삭제" onClick={() => setConfirmDelete(comment.id)}><Trash2 className="size-3.5" aria-hidden="true"/></Button>}
            </div>
            </div>
            {confirmDelete === comment.id && <div className={`flex flex-wrap items-center gap-2 text-xs ${comment.isMine ? "justify-end" : ""}`}><span>이 댓글을 삭제할까요?</span><Button type="button" size="xs" variant="destructive" disabled={busy} onClick={() => void remove(comment.id)}>삭제 확인</Button><Button type="button" size="xs" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(null)}>취소</Button></div>}
          </div>
          </div>
        </li>)}</ol> : !error && <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center"><MessageSquare className="size-8 text-primary/50" aria-hidden="true" /><p className="text-sm font-semibold">이번 순위, 할 말 있죠?</p><p className="text-xs text-muted-foreground">아직 조용하네요. 첫 한마디를 남겨보세요.</p></div>}
        </>}
      </StatsScrollArea>
      <form onSubmit={submit} className="shrink-0">
        <label htmlFor="hof-comment" className="sr-only">순위 보고 한마디</label>
        <ClanEmojiInput pickerLabel="댓글 이모티콘 선택" id="hof-comment" editorRef={input} label="순위 보고 한마디" value={draft} onChange={setDraft} maxLength={HOF_COMMENT_MAX_LENGTH} disabled={busy} placeholder="이번 순위에 한마디 남겨보세요." className="min-h-20 max-h-32" actions={<Button type="submit" size="sm" disabled={busy||loading||!draft.trim()}><Send className="size-3.5" aria-hidden/>댓글 등록</Button>}/>
      </form>
    </CardContent>
  );
}
