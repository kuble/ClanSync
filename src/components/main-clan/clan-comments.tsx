"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClanPlayerAvatar } from "@/components/profile/clan-namecards";
import { cn } from "@/lib/utils";
import { ClanEmojiInput, ClanEmojiText } from "./clan-emoji-content";
import { ClanEmojiReactions, EmojiReactionButton } from "./clan-emoji-reactions";
import { COMMENT_REACTIONS, type CommentReaction, type CommentReactionKind } from "@/lib/clan/comment-reactions";
import type { ClanEmojiReaction } from "@/lib/clan/cosmetics";
import styles from "./clan-comment.module.css";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" });
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });
const reactionOptions = COMMENT_REACTIONS.map(option => ({ ...option, value: option.kind }));

type ClanComment = {
  id: string;
  authorId: string | null;
  nickname: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  canDelete: boolean;
  reactions: CommentReaction[];
  emojiReactions?: ClanEmojiReaction[];
};

/** Shared comment UI; each surface supplies its data and reaction actions. */
export function ClanComments<T extends ClanComment>({ comments, clanId, targetKind, onReact, loadReactionPeople, onDelete, disabled = false, className }: {
  comments: readonly T[];
  clanId: string;
  targetKind: "board_comment" | "hof_comment";
  onReact: (comment: T, kind: CommentReactionKind | null) => void | Promise<void>;
  loadReactionPeople: (comment: T, reaction: { kind: CommentReactionKind } | { emojiId: string }) => Promise<{ ok: true; names: string[] } | { ok: false; error: string }>;
  onDelete: (comment: T) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  return <ol className={cn("space-y-5", className)}>{comments.map((comment, index) => {
    const date = new Date(comment.createdAt), day = dateFormat.format(date), time = timeFormat.format(date);
    const showDay = index === 0 || day !== dateFormat.format(new Date(comments[index - 1].createdAt));
    const react = (kind: CommentReactionKind) => void onReact(comment, comment.reactions.some(reaction => reaction.kind === kind && reaction.mine) ? null : kind);
    return <li key={comment.id} className="space-y-3">
      {showDay && <div role="separator" aria-label={day} className={styles.date}><span /><span>{day}</span><span /></div>}
      <div data-comment-row className={cn(styles.comment, "flex items-start gap-2.5", comment.isMine && "flex-row-reverse")}>
        <ClanPlayerAvatar userId={comment.authorId} label={comment.nickname} size={28} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className={cn("flex", comment.isMine && "justify-end")}><strong className={styles.author}>{comment.nickname}</strong></div>
          <div className={cn(styles.message, comment.isMine && styles.mine)}>
            <div className={styles.bubble}>
              <p className={styles.content}><ClanEmojiText text={comment.content} /></p>
              <time dateTime={comment.createdAt} title={`${day} ${time}`} className={styles.time}>{time}</time>
            </div>
            <div className={styles.reactions} aria-label={`${comment.nickname} 댓글 공감`}>
              {COMMENT_REACTIONS.map(option => {
                const reaction = comment.reactions.find(row => row.kind === option.kind);
                return reaction && <EmojiReactionButton key={option.kind} count={reaction.count} aria-pressed={reaction.mine} disabled={disabled} aria-label={`${option.label} 공감 ${reaction.count}명`} loadPeople={() => loadReactionPeople(comment, { kind: option.kind })} onClick={() => react(option.kind)}>{option.emoji}</EmojiReactionButton>;
              })}
              <ClanEmojiReactions clanId={clanId} target={{ kind: targetKind, id: comment.id }} reactions={comment.emojiReactions ?? []} disabled={disabled} pickerLabel={`${comment.nickname} 댓글 공감 선택`} standardOptions={reactionOptions} onStandardSelect={value => { const option = COMMENT_REACTIONS.find(row => row.kind === value); if (option) react(option.kind); }} loadPeople={emojiId => loadReactionPeople(comment, { emojiId })} />
              {comment.canDelete && <Button type="button" variant="ghost" size="icon-sm" aria-label={`${comment.nickname} 댓글 삭제`} title="댓글 삭제" disabled={disabled} className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(comment.id)}><Trash2 className="size-3.5" aria-hidden /></Button>}
            </div>
          </div>
          {confirmDelete === comment.id && comment.canDelete && <div className={cn("flex flex-wrap items-center gap-2 text-xs", comment.isMine && "justify-end")}><span>이 댓글을 삭제할까요?</span><Button type="button" size="xs" variant="destructive" disabled={disabled} onClick={() => void onDelete(comment)}>삭제 확인</Button><Button type="button" size="xs" variant="ghost" disabled={disabled} onClick={() => setConfirmDelete(null)}>취소</Button></div>}
        </div>
      </div>
    </li>;
  })}</ol>;
}

export function ClanCommentComposer({ label, value, onChange, onSubmit, maxLength, disabled = false, submitDisabled = false, placeholder, pickerLabel, id, className }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  maxLength: number;
  disabled?: boolean;
  submitDisabled?: boolean;
  placeholder: string;
  pickerLabel?: string;
  id?: string;
  className?: string;
}) {
  const cannotSubmit = disabled || submitDisabled || !value.trim();
  return <form className={cn(styles.composer, "shrink-0", className)} onSubmit={event => { event.preventDefault(); if (!cannotSubmit) void onSubmit(); }}>
    <ClanEmojiInput id={id} label={label} pickerLabel={pickerLabel} value={value} onChange={onChange} maxLength={maxLength} disabled={disabled} placeholder={placeholder} className="min-h-20 max-h-32" actions={<Button type="submit" size="sm" disabled={cannotSubmit}><Send className="size-3.5" aria-hidden />댓글 등록</Button>} />
  </form>;
}
