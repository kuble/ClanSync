"use client";

import { useTranslator } from "#use-translator";
import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClanPlayerAvatar, type PlayerAvatarAppearance } from "@/components/profile/clan-namecards";
import { cn } from "@/lib/utils";
import { ClanEmojiInput, ClanEmojiText } from "./clan-emoji-content";
import { ClanEmojiReactions, EmojiReactionButton } from "./clan-emoji-reactions";
import { COMMENT_REACTIONS, type CommentReaction, type CommentReactionKind } from "@/lib/clan/comment-reactions";
import type { ClanEmojiReaction } from "@/lib/clan/cosmetics";
import { containsEmoji } from "@/lib/clan/emoji-text";
import styles from "./clan-comment.module.css";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" });
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit", hourCycle: "h23" });
const reactionOptions = COMMENT_REACTIONS.map(option => ({ ...option, value: option.kind }));

export type ClanComment = {
  id: string;
  authorId: string | null;
  nickname: string;
  content: string;
  createdAt: string | null;
  avatar?: PlayerAvatarAppearance | null;
  isMine: boolean;
  canDelete?: boolean;
  reactions?: CommentReaction[];
  emojiReactions?: ClanEmojiReaction[];
};

type ReactionControls<T> = {
  textOnly?: false;
  clanId: string;
  targetKind: "board_comment" | "hof_comment";
  onReact: (comment: T, kind: CommentReactionKind | null) => void | Promise<void>;
  loadReactionPeople: (comment: T, reaction: { kind: CommentReactionKind } | { emojiId: string }) => Promise<{ ok: true; names: string[] } | { ok: false; error: string }>;
};

/** Shared comment UI; text-only threads have no emoji or reaction endpoints. */
export function ClanComments<T extends ClanComment>(props: {
  comments: readonly T[];
  disabled?: boolean;
  className?: string;
} & ((ReactionControls<T> & { onDelete: (comment: T) => void | Promise<void> }) | { textOnly: true })) {
  const tx = useTranslator();
  const { comments, disabled = false, className } = props;
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  return <ol className={cn(styles.list, className)}>{comments.map((comment, index) => {
    const date = comment.createdAt ? new Date(comment.createdAt) : null;
    const day = date && dateFormat.format(date);
    const previous = comments[index - 1];
    const showDay = day && (!previous?.createdAt || day !== dateFormat.format(new Date(previous.createdAt)));
    const continuation = !showDay && !!comment.authorId && previous?.authorId === comment.authorId;
    const next = comments[index + 1];
    const showTime = date && (!next?.createdAt || !comment.authorId || next.authorId !== comment.authorId || Math.floor(date.getTime() / 60_000) !== Math.floor(Date.parse(next.createdAt) / 60_000));
    return <li key={comment.id} className={cn("space-y-3", continuation && styles.continuation)}>
      {showDay && <div role="separator" aria-label={day} className={styles.date}><span /><span>{day}</span><span /></div>}
      <div data-comment-row className={cn(styles.comment, "flex items-start gap-2.5", comment.isMine && "flex-row-reverse")}>
        {continuation ? <span className="size-7 shrink-0" aria-hidden="true" /> : <ClanPlayerAvatar userId={comment.authorId} appearance={comment.avatar} label={comment.nickname} size={28} />}
        <div className={cn("min-w-0 flex-1", !continuation && "space-y-1.5")}>
          {continuation ? <span className="sr-only">{comment.nickname}</span> : <div className={cn("flex", comment.isMine && "justify-end")}><strong className={styles.author}>{comment.nickname}</strong></div>}
          <div className={cn(styles.message, comment.isMine && styles.mine)}>
            <div className={styles.bubble}>
              <p className={styles.content}>{props.textOnly ? comment.content : <ClanEmojiText text={comment.content} />}</p>
              {showTime && <time dateTime={comment.createdAt!} title={`${day} ${timeFormat.format(date)}`} className={styles.time}>{timeFormat.format(date)}</time>}
            </div>
            {!props.textOnly && <div className={styles.reactions} aria-label={tx("{0} 댓글 공감", comment.nickname)}>
              <CommentReactions comment={comment} controls={props} disabled={disabled} />
              {comment.canDelete && <Button type="button" variant="ghost" size="icon-sm" aria-label={tx("{0} 댓글 삭제", comment.nickname)} title={tx("댓글 삭제")} disabled={disabled} className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(comment.id)}><Trash2 className="size-3.5" aria-hidden /></Button>}
            </div>}
          </div>
          {!props.textOnly && confirmDelete === comment.id && comment.canDelete && <div className={cn("flex flex-wrap items-center gap-2 text-xs", comment.isMine && "justify-end")}><span>{tx("이 댓글을 삭제하시겠습니까?")}</span><Button type="button" size="xs" variant="destructive" disabled={disabled} onClick={() => void props.onDelete(comment)}>{tx("삭제 확인")}</Button><Button type="button" size="xs" variant="ghost" disabled={disabled} onClick={() => setConfirmDelete(null)}>{tx("취소")}</Button></div>}
        </div>
      </div>
    </li>;
  })}</ol>;
}

function CommentReactions<T extends ClanComment>({ comment, controls, disabled }: { comment: T; controls: ReactionControls<T>; disabled: boolean }) {
  const tx = useTranslator();
  const { clanId, targetKind, onReact, loadReactionPeople } = controls;
  const react = (kind: CommentReactionKind) => void onReact(comment, comment.reactions?.some(reaction => reaction.kind === kind && reaction.mine) ? null : kind);
  return <>
    {COMMENT_REACTIONS.map(option => {
      const reaction = comment.reactions?.find(row => row.kind === option.kind);
      return reaction && <EmojiReactionButton key={option.kind} count={reaction.count} aria-pressed={reaction.mine} disabled={disabled} aria-label={tx("{0} 공감 {1}명", option.label, reaction.count)} loadPeople={() => loadReactionPeople(comment, { kind: option.kind })} onClick={() => react(option.kind)}>{option.emoji}</EmojiReactionButton>;
    })}
    <ClanEmojiReactions clanId={clanId} target={{ kind: targetKind, id: comment.id }} reactions={comment.emojiReactions ?? []} disabled={disabled} pickerLabel={`${comment.nickname} 댓글 공감 선택`} standardOptions={reactionOptions} onStandardSelect={value => { const option = COMMENT_REACTIONS.find(row => row.kind === value); if (option) react(option.kind); }} loadPeople={emojiId => loadReactionPeople(comment, { emojiId })} />
  </>;
}

export function ClanCommentComposer({ label, value, onChange, onSubmit, maxLength, disabled = false, submitDisabled = false, placeholder, pickerLabel, id, className, textOnly = false, submitLabel = "댓글 등록" }: {
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
  textOnly?: boolean;
  submitLabel?: string;
}) {
  const tx = useTranslator();
  const invalidEmoji = textOnly && containsEmoji(value);
  const cannotSubmit = disabled || submitDisabled || invalidEmoji || !value.trim();
  return <form className={cn(styles.composer, "shrink-0", className)} onSubmit={event => { event.preventDefault(); if (!cannotSubmit) void onSubmit(); }}>
    <ClanEmojiInput textOnly={textOnly} id={id} label={tx(label)} pickerLabel={tx(pickerLabel)} value={value} onChange={onChange} maxLength={maxLength} disabled={disabled} placeholder={placeholder} className="min-h-20 max-h-32" actions={<Button type="submit" size="sm" disabled={cannotSubmit}><Send className="size-3.5" aria-hidden />{tx(submitLabel)}</Button>} />
    {invalidEmoji && <p role="alert" className="mt-2 text-xs text-destructive">{tx("이모지를 지우면 메시지를 보낼 수 있습니다.")}</p>}
  </form>;
}
