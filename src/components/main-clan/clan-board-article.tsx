"use client";
import { useMovableDrawerTab } from "./use-movable-drawer-tab";
import { useTranslator } from "#use-translator";
import Image from "next/image";
import Link from "next/link";
import {useEffect,useRef,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {ChevronLeft,ChevronRight,ArrowUpRight,Clock3,Heart,RefreshCw,MessageSquare,Pencil,Trash2} from "lucide-react";
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
import { ClanCommentsDrawer } from "./clan-comments-drawer";
import { StatsScrollArea } from "./stats-scroll-area";
import { CardContent } from "@/components/ui/card";
import articleStyles from "./clan-board-article.module.css";

function writeCommentsHash(open: boolean) {
  const url = new URL(window.location.href);
  url.hash = open ? "comments" : "";
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event("hashchange"));
}

function PostBodyText({text}:{text:string}) {
  return text ? <div className="max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-8"><ClanEmojiText text={text}/></div> : null;
}

export function ClanBoardArticle({base,gameSlug,clanId,kind,post,comments,reactions,liked,commentPage,userId,coaches=[],cosmeticAccess=NO_CLAN_COSMETICS,emojis=[],emojiReactions=[],previousPostId=null,nextPostId=null}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;post:BoardPost;comments:BoardComment[];reactions:number;liked:boolean;commentPage:number;userId:string;coaches?:ClanCoach[];cosmeticAccess?:ClanCosmeticAccess;emojis?:ClanEmoji[];emojiReactions?:ClanEmojiReaction[];previousPostId?:string|null;nextPostId?:string|null}){
  const tx = useTranslator();
  const router=useRouter();
  const [commentsOpen,setCommentsOpen]=useState(false);
  const dock = useMovableDrawerTab();
  const opener = useRef<HTMLButtonElement>(null);
  const [editing,setEditing]=useState(false),[remove,setRemove]=useState(false),[comment,setComment]=useState("");
  const [pending,start]=useTransition();
  useEffect(()=>{
    const sync=()=>setCommentsOpen(window.location.hash==="#comments");
    sync();
    window.addEventListener("hashchange",sync);
    return ()=>window.removeEventListener("hashchange",sync);
  },[post.id]);
  // Server-action revalidation can restore the canonical URL without its hash.
  // Keep the current drawer open, including after a reload of its comments.
  useEffect(()=>{
    if(commentsOpen&&!pending&&window.location.hash!=="#comments") writeCommentsHash(true);
  },[commentsOpen,pending]);
  function changeComments(open:boolean){setCommentsOpen(open);writeCommentsHash(open);}
  const details=boardDetails(post.details),video=safeBoardUrl(details.video),live=details.isLive===true;
  const photoOffset=kind==="free" && post.image_path ? Math.min(details.photoOffset??0,post.content.length) : 0;
  const photo=memoryStyle(details,cosmeticAccess);
  const commentRows=comments.map(c=>({...c,authorId:c.author_id,nickname:c.author,createdAt:c.created_at,isMine:c.author_id===userId,canDelete:c.canManage}));
  function mutate(action:()=>Promise<{ok:true;warning?:string}|{ok:false;error:string}>,done?:()=>void){
    start(async()=>{try{const result=await action();if(!result.ok){toast.error(result.error);return;}if(result.warning)toast.warning(result.warning);done?.();}catch{toast.error("저장하지 못했습니다. 작성 내용은 유지됩니다.");}});
  }
  return <div className="board-article isolate grid grid-cols-[minmax(0,1fr)] items-start">
    <button {...dock.handlers} ref={opener} type="button" aria-expanded={commentsOpen} aria-controls="comments" onPointerEnter={event=>{if(event.pointerType==="mouse" && window.matchMedia("(min-width: 1000px)").matches && !pending) changeComments(true);}} onClick={()=>changeComments(true)} disabled={pending} aria-label={"댓글 "+post.commentCount} title={tx("댓글 열기")}
      className={cn(dock.className, "fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl border border-primary/25 bg-background/95 px-2 py-3 text-xs font-semibold text-primary shadow-lg focus-visible:outline-2 focus-visible:outline-ring", commentsOpen && "invisible pointer-events-none")}>
      <MessageSquare className="size-4" aria-hidden />
      <span className="[writing-mode:vertical-rl]">{tx("댓글")}</span>
    </button>
    <article className="col-start-1 row-start-1 min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><ClanPlayerAvatar userId={post.author_id} label={post.author} size={28}/><span className="font-medium">{post.author}</span><span className="text-border" aria-hidden>|</span><time dateTime={post.created_at} className="text-muted-foreground">{boardDate(post.created_at,true)}</time></div>
        {kind!=="memories"&&<h3 className="mt-4 min-w-0 break-words text-xl font-semibold leading-8 tracking-tight sm:text-2xl"><ClanEmojiText text={post.title} large={false}/></h3>}
      </header>
      <div className="space-y-6 p-5 sm:p-7">
        {kind==="feedback"&&<section className="overflow-hidden rounded-lg border border-border bg-background/40" aria-label={tx("코칭 신청 정보")}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><span className={cn("rounded-md px-2.5 py-1 text-xs font-medium",post.status==="complete"?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>{FEEDBACK_STATUS[post.status as keyof typeof FEEDBACK_STATUS]}</span>{post.canSetStatus&&<label className="flex items-center gap-2 text-xs text-muted-foreground">{tx("신청 상태")}<select aria-label={tx("신청 상태")} value={post.status} disabled={pending} onChange={e=>mutate(()=>setBoardStatusAction(gameSlug,clanId,post.id,e.target.value))} className="min-h-9 rounded-md border border-input bg-card px-2 text-foreground">{Object.entries(FEEDBACK_STATUS).map(([key,label])=><option key={key} value={key}>{tx(label)}</option>)}</select></label>}</div>
          <dl className="grid gap-x-6 gap-y-4 p-4 text-sm sm:grid-cols-2">
            <div><dt className="mb-1 text-xs text-muted-foreground">{tx("코칭 선생님")}</dt><dd className="font-medium text-primary">{post.coachName||tx("선생님 미지정 (이전 신청)")}</dd></div>
            <div><dt className="mb-1 text-xs text-muted-foreground">{tx("역할·영웅")}</dt><dd className="break-words">{details.role}</dd></div>
            {details.replay&&<div><dt className="mb-1 text-xs text-muted-foreground">{tx("리플레이 코드")}</dt><dd><code className="rounded bg-muted px-2 py-1 font-mono font-medium tracking-wide">{details.replay}</code></dd></div>}
            {details.moment&&<div><dt className="mb-1 text-xs text-muted-foreground">{tx("궁금한 장면")}</dt><dd className="break-words">{details.moment}</dd></div>}
            {video&&<div><dt className="mb-1 text-xs text-muted-foreground">{tx("플레이 영상")}</dt><dd><a href={video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">{tx("영상 열기")}<ArrowUpRight className="size-3.5" aria-hidden/></a></dd></div>}
          </dl>
        </section>}
        {kind==="channels"&&<section className="space-y-5" aria-label={tx("방송 정보")}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ClanChannelStatus live={live}/><span className="text-[11px] text-muted-foreground">{tx("작성자 설정")}</span></div>
            {post.canSetChannelLive&&<div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{tx("생방송 표시")}</span><button type="button" role="switch" aria-label={tx("생방송 표시")} aria-checked={live} disabled={pending} onClick={()=>mutate(()=>setChannelLiveAction(gameSlug,clanId,post.id,!live))} className="group inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"><span aria-hidden className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",live?"bg-primary":"bg-muted")}><span className={cn("size-5 rounded-full bg-foreground shadow-sm transition-transform motion-reduce:transition-none",live?"translate-x-5":"translate-x-0")}/></span></button></div>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4"><Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden/><div className="min-w-0"><h4 className="text-xs text-muted-foreground">{tx("방송 시간")}</h4><p className="mt-1 break-words text-sm font-medium leading-6">{details.schedule||tx("방송 시간 자유")}</p></div></div><div className="min-w-0 space-y-3 rounded-lg bg-muted/30 p-4"><h4 className="text-xs text-muted-foreground">{tx("방송 플랫폼")}</h4><ClanChannelLinks channels={boardChannels(details)}/></div></div>
        </section>}
        {photoOffset>0&&<PostBodyText text={post.content.slice(0,photoOffset)}/>}
        {post.image_path&&<a href={boardImageUrl(base,post.id)} target="_blank" rel="noopener noreferrer" aria-label={tx("사진 원본 보기")} className="block overflow-hidden rounded-lg bg-muted/20">{kind==="memories"?<div className="mx-auto max-w-xl p-4"><MemoryPhoto src={boardImageUrl(base,post.id)} caption={post.content||post.title} alt={post.content||post.title} frame={photo.photoFrame} sticker={photo.photoSticker} stickerPlacement={photo.photoStickerPlacement} stickers={photo.photoStickers}/></div>:<Image unoptimized src={boardImageUrl(base,post.id)} width={1600} height={1200} alt={post.content||post.title} className="mx-auto max-h-[70dvh] w-auto max-w-full object-contain"/>}</a>}
        {kind!=="channels"&&kind!=="memories"&&<PostBodyText text={post.content.slice(photoOffset)}/>}
      </div>
      <footer className={articleStyles.footer}>
        <div className={articleStyles.feedback}><Button variant="outline" size="sm" aria-pressed={liked} disabled={pending} onClick={()=>mutate(()=>setBoardReactionAction(gameSlug,clanId,post.id,!liked))}><Heart className={liked?"size-4 fill-primary text-primary":"size-4"} aria-hidden/>{tx("공감")} {reactions}</Button>
          <ClanEmojiReactions showPicker={false} gameSlug={gameSlug} clanId={clanId} postId={post.id} emojis={emojis} reactions={emojiReactions}/>
        </div>
        <nav className={articleStyles.navigation} aria-label={tx("게시글 이동")}>{previousPostId?<Link prefetch={false} href={base+"/board/"+kind+"/"+previousPostId} aria-label={tx("이전 글")}><ChevronLeft className="size-3.5" aria-hidden/>{tx("이전")}</Link>:<span aria-disabled="true" aria-label={tx("이전 글")}><ChevronLeft className="size-3.5" aria-hidden/>{tx("이전")}</span>}<Link prefetch={false} href={base+"/board/"+kind}>{tx("목록으로")}</Link>{nextPostId?<Link prefetch={false} href={base+"/board/"+kind+"/"+nextPostId} aria-label={tx("다음 글")}>{tx("다음")}<ChevronRight className="size-3.5" aria-hidden/></Link>:<span aria-disabled="true" aria-label={tx("다음 글")}>{tx("다음")}<ChevronRight className="size-3.5" aria-hidden/></span>}</nav>
        {post.canManage&&<div className={articleStyles.actions} role="group" aria-label={tx("게시글 관리")}><Button variant="ghost" size="icon" aria-label={tx("편집")} title={tx("편집")} disabled={pending} className="text-muted-foreground" onClick={()=>setEditing(true)}><Pencil className="size-4" aria-hidden/></Button><Button variant="ghost" size="icon" aria-label={tx("삭제")} title={tx("삭제")} disabled={pending} className="text-muted-foreground hover:text-destructive" onClick={()=>setRemove(true)}><Trash2 className="size-4" aria-hidden/></Button></div>}
      </footer>
    </article>
    <ClanCommentsDrawer id="comments" open={commentsOpen} onOpenChange={changeComments} finalFocus={opener}
      title={tx("댓글 {0}", post.commentCount)} label={post.title}
      action={<Button variant="ghost" size="icon-sm" aria-label={tx("댓글 새로고침")} disabled={pending} onClick={()=>start(()=>router.refresh())}><RefreshCw className="size-3.5" aria-hidden /></Button>}>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
      <StatsScrollArea label={tx("게시글 댓글 목록")} className="min-h-0 flex-1">
      <ClanComments comments={commentRows} clanId={clanId} targetKind="board_comment" disabled={pending}
        onDelete={c=>mutate(()=>deleteBoardCommentAction(gameSlug,clanId,post.id,c.id))}
        onReact={(c,reaction)=>mutate(()=>setBoardCommentReactionAction(gameSlug,clanId,c.id,reaction))}
        loadReactionPeople={(c,reaction)=>"kind" in reaction ? listBoardCommentStandardReactionPeopleAction(gameSlug,clanId,c.id,reaction.kind) : listBoardCommentReactionPeopleAction(gameSlug,clanId,c.id,reaction.emojiId)} />
      {!comments.length&&<p className="py-8 text-center text-sm text-muted-foreground">{tx("첫 댓글을 남겨 주십시오.")}</p>}
      </StatsScrollArea>
      {post.commentCount>50&&<nav className="flex justify-center gap-4 py-4 text-sm" aria-label={tx("댓글 페이지")}>{commentPage>1&&<Link href={"?comments="+(commentPage-1)+"#comments"} scroll={false}>{tx("이전 댓글")}</Link>}<span>{commentPage} / {Math.ceil(post.commentCount/50)}</span>{commentPage*50<post.commentCount&&<Link href={"?comments="+(commentPage+1)+"#comments"} scroll={false}>{tx("다음 댓글")}</Link>}</nav>}
      <ClanCommentComposer className="shrink-0" label={tx("댓글 내용")} value={comment} onChange={setComment} maxLength={1000} disabled={pending} placeholder={tx("클랜원에게 한마디 남겨보십시오.")}
        onSubmit={()=>mutate(()=>addBoardCommentAction(gameSlug,clanId,post.id,comment),()=>setComment(""))} />
      </CardContent>
    </ClanCommentsDrawer>
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} post={post} cosmeticAccess={cosmeticAccess} coaches={coaches} onClose={()=>setEditing(false)}/>}
    <Dialog open={remove} onOpenChange={open=>{if(!open&&!pending)setRemove(false);}}><DialogContent><DialogHeader><DialogTitle>{tx("글을 삭제하시겠습니까?")}</DialogTitle><DialogDescription>{tx("삭제한 내용은 복구할 수 없습니다.")}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={pending} onClick={()=>setRemove(false)}>{tx("취소")}</Button><Button variant="destructive" disabled={pending} onClick={()=>mutate(()=>deleteBoardPostAction(gameSlug,clanId,post.id),()=>{setRemove(false);router.push(base+"/board/"+kind);})}>{pending?tx("삭제 중…"):tx("삭제")}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
