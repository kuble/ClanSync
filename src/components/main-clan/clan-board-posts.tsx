"use client";
import Image from "next/image";
import Link from "next/link";
import {useState,type ReactNode} from "react";
import {Camera,Clock3,GraduationCap,MessageSquare,Plus,Radio,UserRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ClanBoardEditor} from "./clan-board-editor";
import {ClanCoachDirectory} from "./clan-coach-directory";
import {ClanChannelLinks,ClanChannelStatus} from "./clan-channel-links";
import {boardChannels,boardDate,boardDetails,boardImageUrl,FEEDBACK_STATUS,type BoardKind,type BoardListPost} from "@/lib/clan/board";
import type {ClanCoach} from "@/lib/clan/coaching";
import {cn} from "@/lib/utils";
import styles from "./clan-collection.module.css";

export function ClanBoardPosts({base,gameSlug,clanId,kind,title,posts,coaches=[],userId}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;title:string;posts:BoardListPost[];coaches?:ClanCoach[];userId:string}){
  const [editing,setEditing]=useState(false),[coachId,setCoachId]=useState("");
  const available=coaches.filter(c=>c.userId!==userId&&c.accepting);
  const request=(id:string)=>{setCoachId(id);setEditing(true);};
  const create=()=>{setCoachId("");setEditing(true);};
  const createButton=<Button size="sm" disabled={kind==="feedback"&&!available.length} onClick={create}><Plus className="size-4" aria-hidden/>{kind==="memories"?"추억 남기기":kind==="feedback"?"피드백 신청":kind==="channels"?"채널 등록":"글 작성"}</Button>;
  return <section className="space-y-5" aria-label={title}>
    {kind==="feedback"&&<ClanCoachDirectory coaches={coaches} userId={userId} gameSlug={gameSlug} clanId={clanId} onRequest={request} requestAction={createButton}/>}
    {!posts.length?<div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center",kind==="memories"?"min-h-96":"min-h-64")}>{kind==="memories"?<Camera className="size-6 text-muted-foreground" aria-hidden/>:kind==="channels"?<Radio className="size-6 text-muted-foreground" aria-hidden/>:<MessageSquare className="size-6 text-muted-foreground" aria-hidden/>}<p className="text-sm">아직 등록된 {kind==="memories"?"추억":kind==="feedback"?"신청":kind==="channels"?"채널":"글"}이 없어요.</p><p className="text-xs text-muted-foreground">{kind==="feedback"?"선생님을 선택해 첫 피드백을 요청해 보세요.":kind==="channels"?"첫 방송 채널을 등록해 주세요.":"첫 이야기를 남겨 주세요."}</p>{kind!=="feedback"&&createButton}</div>
      :kind==="memories"?<MemoryGallery base={base} posts={posts} onCreate={create}/>
      :kind==="channels"?<div className="grid gap-4 sm:grid-cols-2"><button type="button" aria-label="채널 등록" onClick={create} className="flex min-h-36 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-56"><span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Plus className="size-6" aria-hidden/></span><span className="text-sm font-semibold">채널 등록</span><span className="text-xs leading-6 text-muted-foreground">내 방송을 클랜원에게 소개해 보세요.</span></button>{posts.map(p=>{const d=boardDetails(p.details);return <article key={p.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card"><div className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><ClanChannelStatus live={d.isLive===true}/><span className="text-[11px] text-muted-foreground">{boardChannels(d).length}개 플랫폼</span></div><Link prefetch={false} className="block break-words text-lg font-semibold leading-7 tracking-tight hover:text-primary" href={base+"/board/channels/"+p.id}>{p.title}</Link><div className="flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="size-3.5 shrink-0" aria-hidden/><span className="truncate">{p.author}</span></div><div className="flex items-start gap-2 text-sm leading-6"><Clock3 className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden/><p className="break-words">{d.schedule||"방송 시간 자유"}</p></div></div><div className="mt-auto border-t border-border bg-muted/15 p-4"><ClanChannelLinks channels={boardChannels(d)}/></div></article>;})}</div>
      :<BoardPostRows base={base} kind={kind} posts={posts} action={kind==="free"?createButton:undefined}/>}
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} coaches={coaches.filter(c=>c.userId!==userId)} initialCoachId={coachId} onClose={()=>setEditing(false)}/>}
  </section>;
}
function BoardPostRows({base,kind,posts,action}:{base:string;kind:BoardKind;posts:BoardListPost[];action?:ReactNode}){
  const feedback=kind==="feedback";
  const columns=feedback?"md:grid-cols-[72px_minmax(0,1fr)_132px_48px]":"md:grid-cols-[minmax(0,1fr)_48px]";
  const status=(p:BoardListPost)=><span className={cn("inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 text-[11px] font-medium",p.status==="complete"?"bg-primary/10 text-primary":p.status==="answering"?"bg-sky-500/10 text-sky-400":"bg-muted text-muted-foreground")}>{FEEDBACK_STATUS[p.status as keyof typeof FEEDBACK_STATUS]}</span>;
  return <section className="min-h-64 overflow-hidden rounded-xl border border-border bg-card" aria-label={feedback?"피드백 신청 목록":"게시글 목록"}>
    {feedback?<div aria-hidden className={cn("hidden items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground md:grid",columns)}><span className="text-center">상태</span><span>신청 내용</span><span>담당 선생님</span><span className="text-center">댓글</span></div>:<div className="flex min-h-12 items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-2"><span className="text-[11px] text-muted-foreground">글 제목</span>{action}</div>}
    <ul className="divide-y divide-border">{posts.map(p=><li key={p.id}>
      <Link href={base+"/board/"+kind+"/"+p.id} prefetch={false} className={cn("group grid min-h-20 grid-cols-[minmax(0,1fr)_48px] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]",columns)}>
        {feedback&&<div className="hidden justify-center md:flex">{status(p)}</div>}
        <div className="min-w-0"><div className="flex min-w-0 items-center gap-2">{feedback&&<span className="shrink-0 md:hidden">{status(p)}</span>}<p className="truncate text-sm font-semibold group-hover:text-primary">{p.title}</p>{p.image_path&&<Image unoptimized src={boardImageUrl(base,p.id,true)} width={36} height={36} alt="첨부 사진" className="size-9 shrink-0 rounded-md object-cover"/>}</div><p className="mt-1.5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground"><span className="truncate">{p.author}</span><span aria-hidden>·</span><time className="shrink-0" dateTime={p.created_at}>{boardDate(p.created_at)}</time></p></div>
        {feedback&&<div className="col-start-1 row-start-2 flex min-w-0 items-center gap-1.5 text-xs md:col-auto md:row-auto"><GraduationCap className="size-3.5 shrink-0 text-muted-foreground" aria-hidden/><span className={cn("truncate",p.coachName?"text-primary":"text-muted-foreground")}>{p.coachName||"미지정"}</span></div>}
        <span aria-label={"댓글 "+p.commentCount} className="col-start-2 row-start-1 row-span-2 flex items-center justify-center gap-1.5 rounded-md bg-muted/40 px-1 py-2 text-xs tabular-nums text-muted-foreground md:col-auto md:row-auto md:row-span-1"><MessageSquare className="size-3.5" aria-hidden/><span>{p.commentCount}</span></span>
      </Link>
    </li>)}</ul>
  </section>;
}
function MemoryGallery({base,posts,onCreate}:{base:string;posts:BoardListPost[];onCreate:()=>void}){
  return <section aria-label="추억 앨범">
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><button type="button" aria-label="추억 남기기" onClick={onCreate} className={cn(styles.polaroid,styles.memoryAdd)}><span className={styles.memoryAddPhoto}><Camera className="size-8" strokeWidth={1.5} aria-hidden/></span><span className={styles.memoryCaption}>추억 남기기</span><span className={styles.memoryDate}>함께한 순간을 사진으로 남겨요.</span></button>{posts.map((p,i)=><Link key={p.id} prefetch={false} href={base+"/board/memories/"+p.id} className={styles.polaroid} style={{transform:"rotate("+(i%3-1)*2+"deg)"}}>
      <Image unoptimized loading={i<2?"eager":"lazy"} src={boardImageUrl(base,p.id,true)} width={600} height={450} alt={p.content||p.title} className={styles.memoryImage}/><span className={styles.memoryCaption}>{p.content||p.title}</span><span className={styles.memoryDate}><time dateTime={p.created_at}>{boardDate(p.created_at)}</time> · {p.author}</span>
    </Link>)}</div>
  </section>;
}
