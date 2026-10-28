"use client";
import Image from "next/image";
import Link from "next/link";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {ArrowLeft,ArrowUpRight,Clock3,Heart,MessageSquare,Pencil,Send,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/components/ui/dialog";
import {deleteBoardPostAction,saveBoardCommentAction,deleteBoardCommentAction,setBoardReactionAction,setBoardStatusAction,setChannelLiveAction} from "@/app/actions/clan-board";
import {boardChannels,boardDetails,boardImageUrl,boardDate,safeBoardUrl,FEEDBACK_STATUS,type BoardKind,type BoardPost,type BoardComment} from "@/lib/clan/board";
import {ClanBoardEditor} from "./clan-board-editor";
import type {ClanCoach} from "@/lib/clan/coaching";
import {ClanChannelLinks,ClanChannelStatus} from "./clan-channel-links";
import {cn} from "@/lib/utils";
import { MemoryPhoto } from "./memory-photo";
import { ClanEmojiInput, ClanEmojiText } from "./clan-emoji-content";
import { ClanEmojiReactions } from "./clan-emoji-reactions";
import { NO_CLAN_COSMETICS, memoryStyle, type ClanCosmeticAccess, type ClanEmoji, type ClanEmojiReaction } from "@/lib/clan/cosmetics";

export function ClanBoardArticle({base,gameSlug,clanId,kind,post,comments,reactions,liked,commentPage,coaches=[],cosmeticAccess=NO_CLAN_COSMETICS,emojis=[],emojiReactions=[]}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;post:BoardPost;comments:BoardComment[];reactions:number;liked:boolean;commentPage:number;userId:string;coaches?:ClanCoach[];cosmeticAccess?:ClanCosmeticAccess;emojis?:ClanEmoji[];emojiReactions?:ClanEmojiReaction[]}){
  const router=useRouter();
  const [editing,setEditing]=useState(false),[remove,setRemove]=useState<string|null>(null),[comment,setComment]=useState(""),[commentEdit,setCommentEdit]=useState<BoardComment|null>(null);
  const [pending,start]=useTransition();
  const details=boardDetails(post.details),video=safeBoardUrl(details.video),live=details.isLive===true;
  const photo=memoryStyle(details,cosmeticAccess);
  function mutate(action:()=>Promise<{ok:true;warning?:string}|{ok:false;error:string}>,done?:()=>void){
    start(async()=>{try{const result=await action();if(!result.ok){toast.error(result.error);return;}if(result.warning)toast.warning(result.warning);done?.();}catch{toast.error("저장하지 못했습니다. 작성 내용은 유지됩니다.");}});
  }
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <Link href={base+"/board/"+kind} className="inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" aria-hidden/>목록으로</Link>
      {post.canManage&&<div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="편집" title="편집" disabled={pending} className="text-muted-foreground" onClick={()=>setEditing(true)}><Pencil className="size-4" aria-hidden/></Button><Button variant="ghost" size="icon" aria-label="삭제" title="삭제" disabled={pending} className="text-muted-foreground hover:text-destructive" onClick={()=>setRemove("post")}><Trash2 className="size-4" aria-hidden/></Button></div>}
    </div>
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-6 sm:px-7">
        <h3 className="break-words text-xl font-semibold leading-8 tracking-tight sm:text-2xl"><ClanEmojiText text={post.title} large={false}/></h3>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="font-medium">{post.author}</span><span className="text-border" aria-hidden>|</span><time dateTime={post.created_at} className="text-muted-foreground">{boardDate(post.created_at,true)}</time></div>
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
        {post.image_path&&<a href={boardImageUrl(base,post.id)} target="_blank" rel="noopener noreferrer" aria-label="사진 원본 보기" className="block overflow-hidden rounded-lg bg-muted/20">{kind==="memories"?<div className="mx-auto max-w-xl p-4"><MemoryPhoto src={boardImageUrl(base,post.id)} caption="" alt={post.content||post.title} frame={photo.photoFrame} sticker={photo.photoSticker}/></div>:<Image unoptimized src={boardImageUrl(base,post.id)} width={1600} height={1200} alt={post.content||post.title} className="mx-auto max-h-[70dvh] w-auto max-w-full object-contain"/>}</a>}
        {kind!=="channels"&&<div className="max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-8"><ClanEmojiText text={post.content}/></div>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7"><Button variant="outline" size="sm" aria-pressed={liked} disabled={pending} onClick={()=>mutate(()=>setBoardReactionAction(gameSlug,clanId,post.id,!liked))}><Heart className={liked?"size-4 fill-primary text-primary":"size-4"} aria-hidden/>공감 {reactions}</Button><ClanEmojiReactions gameSlug={gameSlug} clanId={clanId} postId={post.id} emojis={emojis} reactions={emojiReactions}/><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageSquare className="size-4" aria-hidden/>댓글 {post.commentCount}</span></footer>
    </article>
    <section id="comments" className="min-h-64 rounded-xl border border-border bg-card p-5 sm:p-6" aria-label="게시글 댓글">
      <h4 className="flex items-center gap-2 text-sm font-semibold">댓글 <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{post.commentCount}</span></h4>
      <ul className="mt-3 divide-y divide-border">{comments.map(c=><li key={c.id} className="py-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="font-medium">{c.author}</span><time dateTime={c.created_at} className="text-[11px] text-muted-foreground">{boardDate(c.created_at,true)}</time></div>{c.canManage&&<div className="-mr-1 -mt-1 flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label="댓글 편집" title="댓글 편집" disabled={pending} className="text-muted-foreground" onClick={()=>{setCommentEdit(c);setComment(c.content);}}><Pencil className="size-3.5" aria-hidden/></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="댓글 삭제" title="댓글 삭제" disabled={pending} className="text-muted-foreground hover:text-destructive" onClick={()=>setRemove(c.id)}><Trash2 className="size-3.5" aria-hidden/></Button></div>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7"><ClanEmojiText text={c.content}/></p><ClanEmojiReactions gameSlug={gameSlug} clanId={clanId} target={{kind:"board_comment",id:c.id}} reactions={c.emojiReactions??[]}/></li>)}</ul>
      {!comments.length&&<p className="py-8 text-center text-sm text-muted-foreground">첫 댓글을 남겨 주세요.</p>}
      {post.commentCount>50&&<nav className="flex justify-center gap-4 py-4 text-sm" aria-label="댓글 페이지">{commentPage>1&&<Link href={"?comments="+(commentPage-1)}>이전 댓글</Link>}<span>{commentPage} / {Math.ceil(post.commentCount/50)}</span>{commentPage*50<post.commentCount&&<Link href={"?comments="+(commentPage+1)}>다음 댓글</Link>}</nav>}
      <form className="mt-5" onSubmit={e=>{e.preventDefault();mutate(()=>saveBoardCommentAction(gameSlug,clanId,post.id,comment,commentEdit?.id??null),()=>{setComment("");setCommentEdit(null);});}}>
        <ClanEmojiInput label="댓글 내용" value={comment} onChange={setComment} maxLength={1000} disabled={pending} placeholder={commentEdit?"댓글을 수정해 주세요.":"클랜원에게 한마디 남겨보세요."} actions={<>{commentEdit&&<Button type="button" variant="ghost" size="sm" disabled={pending} onClick={()=>{setCommentEdit(null);setComment("");}}>편집 취소</Button>}<Button type="submit" size="sm" disabled={pending||!comment.trim()}><Send className="size-3.5" aria-hidden/>{pending?"저장 중…":commentEdit?"댓글 수정":"댓글 등록"}</Button></>}/>
      </form>
    </section>
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} post={post} cosmeticAccess={cosmeticAccess} coaches={coaches} onClose={()=>setEditing(false)}/>}
    <Dialog open={remove!==null} onOpenChange={open=>{if(!open&&!pending)setRemove(null);}}><DialogContent><DialogHeader><DialogTitle>{remove==="post"?"글을 삭제할까요?":"댓글을 삭제할까요?"}</DialogTitle><DialogDescription>삭제한 내용은 복구할 수 없습니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={pending} onClick={()=>setRemove(null)}>취소</Button><Button variant="destructive" disabled={pending} onClick={()=>{if(remove==="post")mutate(()=>deleteBoardPostAction(gameSlug,clanId,post.id),()=>{setRemove(null);router.push(base+"/board/"+kind);});else if(remove)mutate(()=>deleteBoardCommentAction(gameSlug,clanId,post.id,remove),()=>setRemove(null));}}>{pending?"삭제 중…":"삭제"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
