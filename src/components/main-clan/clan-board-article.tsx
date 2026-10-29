"use client";
import Image from "next/image";
import Link from "next/link";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {ChevronLeft,ChevronRight,ArrowUpRight,Clock3,Heart,Pencil,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/components/ui/dialog";
import {deleteBoardPostAction,addBoardCommentAction,deleteBoardCommentAction,setBoardReactionAction,setBoardStatusAction,setChannelLiveAction} from "@/app/actions/clan-board";
import {boardChannels,boardDetails,boardImageUrl,boardDate,safeBoardUrl,FEEDBACK_STATUS,type BoardKind,type BoardPost,type BoardComment} from "@/lib/clan/board";
import {ClanBoardEditor} from "./clan-board-editor";
import type {ClanCoach} from "@/lib/clan/coaching";
import {ClanChannelLinks,ClanChannelStatus} from "./clan-channel-links";
import {cn} from "@/lib/utils";
import { MemoryPhoto } from "./memory-photo";
import { ClanEmojiText } from "./clan-emoji-content";
import { ClanEmojiReactions } from "./clan-emoji-reactions";
import { listBoardCommentReactionPeopleAction } from "@/app/actions/clan-emoji-reactions";
import { listBoardCommentStandardReactionPeopleAction, setBoardCommentReactionAction } from "@/app/actions/board-comment-reactions";
import { NO_CLAN_COSMETICS, memoryStyle, type ClanCosmeticAccess, type ClanEmoji, type ClanEmojiReaction } from "@/lib/clan/cosmetics";
import { ClanCommentComposer, ClanComments } from "./clan-comments";
import { ClanPlayerAvatar } from "@/components/profile/clan-namecards";
import articleStyles from "./clan-board-article.module.css";
import { StatsScrollArea } from "./stats-scroll-area";

export function ClanBoardArticle({base,gameSlug,clanId,kind,post,comments,reactions,liked,commentPage,userId,coaches=[],cosmeticAccess=NO_CLAN_COSMETICS,emojis=[],emojiReactions=[],previousPostId=null,nextPostId=null}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;post:BoardPost;comments:BoardComment[];reactions:number;liked:boolean;commentPage:number;userId:string;coaches?:ClanCoach[];cosmeticAccess?:ClanCosmeticAccess;emojis?:ClanEmoji[];emojiReactions?:ClanEmojiReaction[];previousPostId?:string|null;nextPostId?:string|null}){
  const router=useRouter();
  const [editing,setEditing]=useState(false),[remove,setRemove]=useState(false),[comment,setComment]=useState("");
  const [pending,start]=useTransition();
  const details=boardDetails(post.details),video=safeBoardUrl(details.video),live=details.isLive===true;
  const photo=memoryStyle(details,cosmeticAccess);
  const commentRows=comments.map(c=>({...c,authorId:c.author_id,nickname:c.author,createdAt:c.created_at,isMine:c.author_id===userId,canDelete:c.canManage}));
  function mutate(action:()=>Promise<{ok:true;warning?:string}|{ok:false;error:string}>,done?:()=>void){
    start(async()=>{try{const result=await action();if(!result.ok){toast.error(result.error);return;}if(result.warning)toast.warning(result.warning);done?.();}catch{toast.error("저장하지 못했습니다. 작성 내용은 유지됩니다.");}});
  }
  return <div className="space-y-5">
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><ClanPlayerAvatar userId={post.author_id} label={post.author} size={28}/><span className="font-medium">{post.author}</span><span className="text-border" aria-hidden>|</span><time dateTime={post.created_at} className="text-muted-foreground">{boardDate(post.created_at,true)}</time></div>
        {kind!=="memories"&&<h3 className="mt-4 min-w-0 break-words text-xl font-semibold leading-8 tracking-tight sm:text-2xl"><ClanEmojiText text={post.title} large={false}/></h3>}
      </header>
      <div className="space-y-6 p-5 sm:p-7">
        {kind==="feedback"&&<section className="overflow-hidden rounded-lg border border-border bg-background/40" aria-label="코칭 신청 정보">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><span className={cn("rounded-md px-2.5 py-1 text-xs font-medium",post.status==="complete"?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>{FEEDBACK_STATUS[post.status as keyof typeof FEEDBACK_STATUS]}</span>{post.canSetStatus&&<label className="flex items-center gap-2 text-xs text-muted-foreground">신청 상태<select aria-label="신청 상태" value={post.status} disabled={pending} onChange={e=>mutate(()=>setBoardStatusAction(gameSlug,clanId,post.id,e.target.value))} className="min-h-9 rounded-md border border-input bg-card px-2 text-foreground">{Object.entries(FEEDBACK_STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}</div>
          <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2">
            <div><dt className="mb-1 text-xs text-muted-foreground">코칭 선생님</dt><dd className="font-medium text-primary">{post.coachName||"선생님 미지정 (이전 신청)"}</dd></div>
            <div><dt className="mb-1 text-xs text-muted-foreground">역할·영웅</dt><dd className="break-words">{details.role}</dd></div>
            {details.replay&&<div><dt className="mb-1 text-xs text-muted-foreground">리플레이 코드</dt><dd><code className="rounded bg-muted px-2 py-1 font-mono font-medium tracking-wide">{details.replay}</code></dd></div>}
            {details.moment&&<div><dt className="mb-1 text-xs text-muted-foreground">궁금한 장면</dt><dd className="break-words">{details.moment}</dd></div>}
            {video&&<div><dt className="mb-1 text-xs text-muted-foreground">플레이 영상</dt><dd><a href={video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">영상 열기<ArrowUpRight className="size-3.5" aria-hidden/></a></dd></div>}
          </dl>
        </section>}
        {kind==="channels"&&<section className="space-y-5" aria-label="방송 정보">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ClanChannelStatus live={live}/><span className="text-[11px] text-muted-foreground">작성자 설정</span></div>
            {post.canSetChannelLive&&<div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">생방송 표시</span><button type="button" role="switch" aria-label="생방송 표시" aria-checked={live} disabled={pending} onClick={()=>mutate(()=>setChannelLiveAction(gameSlug,clanId,post.id,!live))} className="group inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"><span aria-hidden className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",live?"bg-primary":"bg-muted")}><span className={cn("size-5 rounded-full bg-foreground shadow-sm transition-transform motion-reduce:transition-none",live?"translate-x-5":"translate-x-0")}/></span></button></div>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4"><Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden/><div className="min-w-0"><h4 className="text-xs text-muted-foreground">방송 시간</h4><p className="mt-1 break-words text-sm font-medium leading-6">{details.schedule||"방송 시간 자유"}</p></div></div><div className="min-w-0 space-y-3 rounded-lg bg-muted/30 p-4"><h4 className="text-xs text-muted-foreground">방송 플랫폼</h4><ClanChannelLinks channels={boardChannels(details)}/></div></div>
        </section>}
        {post.image_path&&<a href={boardImageUrl(base,post.id)} target="_blank" rel="noopener noreferrer" aria-label="사진 원본 보기" className="block overflow-hidden rounded-lg bg-muted/20">{kind==="memories"?<div className="mx-auto max-w-xl p-4"><MemoryPhoto src={boardImageUrl(base,post.id)} caption={post.content||post.title} alt={post.content||post.title} frame={photo.photoFrame} sticker={photo.photoSticker} stickerPlacement={photo.photoStickerPlacement} stickers={photo.photoStickers}/></div>:<Image unoptimized src={boardImageUrl(base,post.id)} width={1600} height={1200} alt={post.content||post.title} className="mx-auto max-h-[70dvh] w-auto max-w-full object-contain"/>}</a>}
        {kind!=="channels"&&kind!=="memories"&&<div className="max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-8"><ClanEmojiText text={post.content}/></div>}
      </div>
      <footer className={articleStyles.footer}>
        <div className={articleStyles.feedback}><Button variant="outline" size="sm" aria-pressed={liked} disabled={pending} onClick={()=>mutate(()=>setBoardReactionAction(gameSlug,clanId,post.id,!liked))}><Heart className={liked?"size-4 fill-primary text-primary":"size-4"} aria-hidden/>공감 {reactions}</Button></div>
        <nav className={articleStyles.navigation} aria-label="게시글 이동">{previousPostId?<Link prefetch={false} href={base+"/board/"+kind+"/"+previousPostId} aria-label="이전 글"><ChevronLeft className="size-3.5" aria-hidden/>이전</Link>:<span aria-disabled="true" aria-label="이전 글"><ChevronLeft className="size-3.5" aria-hidden/>이전</span>}<Link prefetch={false} href={base+"/board/"+kind}>목록으로</Link>{nextPostId?<Link prefetch={false} href={base+"/board/"+kind+"/"+nextPostId} aria-label="다음 글">다음<ChevronRight className="size-3.5" aria-hidden/></Link>:<span aria-disabled="true" aria-label="다음 글">다음<ChevronRight className="size-3.5" aria-hidden/></span>}</nav>
        {post.canManage&&<div className={articleStyles.actions} role="group" aria-label="게시글 관리"><Button variant="ghost" size="icon" aria-label="편집" title="편집" disabled={pending} className="text-muted-foreground" onClick={()=>setEditing(true)}><Pencil className="size-4" aria-hidden/></Button><Button variant="ghost" size="icon" aria-label="삭제" title="삭제" disabled={pending} className="text-muted-foreground hover:text-destructive" onClick={()=>setRemove(true)}><Trash2 className="size-4" aria-hidden/></Button></div>}
        {emojis.length>0&&<div className={articleStyles.custom}><ClanEmojiReactions gameSlug={gameSlug} clanId={clanId} postId={post.id} emojis={emojis} reactions={emojiReactions}/></div>}
      </footer>
    </article>
    <section id="comments" className="min-h-64 rounded-xl border border-border bg-card p-5 sm:p-6" aria-label="게시글 댓글">
      <h4 className="flex items-center gap-2 text-sm font-semibold">댓글 <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{post.commentCount}</span></h4>
      <StatsScrollArea label="게시글 댓글 목록" className="mt-3 max-h-[min(30rem,50dvh)] overscroll-y-contain">
      <ClanComments comments={commentRows} clanId={clanId} targetKind="board_comment" disabled={pending}
        onDelete={c=>mutate(()=>deleteBoardCommentAction(gameSlug,clanId,post.id,c.id))}
        onReact={(c,reaction)=>mutate(()=>setBoardCommentReactionAction(gameSlug,clanId,c.id,reaction))}
        loadReactionPeople={(c,reaction)=>"kind" in reaction ? listBoardCommentStandardReactionPeopleAction(gameSlug,clanId,c.id,reaction.kind) : listBoardCommentReactionPeopleAction(gameSlug,clanId,c.id,reaction.emojiId)} />
      {!comments.length&&<p className="py-8 text-center text-sm text-muted-foreground">첫 댓글을 남겨 주십시오.</p>}
      </StatsScrollArea>
      {post.commentCount>50&&<nav className="flex justify-center gap-4 py-4 text-sm" aria-label="댓글 페이지">{commentPage>1&&<Link href={"?comments="+(commentPage-1)}>이전 댓글</Link>}<span>{commentPage} / {Math.ceil(post.commentCount/50)}</span>{commentPage*50<post.commentCount&&<Link href={"?comments="+(commentPage+1)}>다음 댓글</Link>}</nav>}
      <ClanCommentComposer className="mt-5" label="댓글 내용" value={comment} onChange={setComment} maxLength={1000} disabled={pending} placeholder="클랜원에게 한마디 남겨보십시오."
        onSubmit={()=>mutate(()=>addBoardCommentAction(gameSlug,clanId,post.id,comment),()=>setComment(""))} />
    </section>
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} post={post} cosmeticAccess={cosmeticAccess} coaches={coaches} onClose={()=>setEditing(false)}/>}
    <Dialog open={remove} onOpenChange={open=>{if(!open&&!pending)setRemove(false);}}><DialogContent><DialogHeader><DialogTitle>글을 삭제하시겠습니까?</DialogTitle><DialogDescription>삭제한 내용은 복구할 수 없습니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={pending} onClick={()=>setRemove(false)}>취소</Button><Button variant="destructive" disabled={pending} onClick={()=>mutate(()=>deleteBoardPostAction(gameSlug,clanId,post.id),()=>{setRemove(false);router.push(base+"/board/"+kind);})}>{pending?"삭제 중…":"삭제"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
