"use client";
import { ClanEmojiText } from "./clan-emoji-content";
import Link from "next/link";
import {useLayoutEffect,useRef,useState,type ReactNode} from "react";
import {Camera,Clock3,GraduationCap,Image as ImageIcon,MessageSquare,Plus,Radio,UserRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ClanBoardEditor} from "./clan-board-editor";
import {ClanCoachDirectory} from "./clan-coach-directory";
import {ClanChannelLinks,ClanChannelStatus} from "./clan-channel-links";
import {BOARD_PAGE_SIZE,boardChannels,boardDate,boardDetails,boardImageUrl,FEEDBACK_STATUS,type BoardKind,type BoardListPost} from "@/lib/clan/board";
import type {ClanCoach} from "@/lib/clan/coaching";
import {cn} from "@/lib/utils";
import styles from "./clan-collection.module.css";
import { MemoryPhoto } from "./memory-photo";
import galleryStyles from "./memory-gallery.module.css";
import { NO_CLAN_COSMETICS, memoryStyle, type ClanCosmeticAccess } from "@/lib/clan/cosmetics";

export function ClanBoardPosts({base,gameSlug,clanId,kind,title,posts,total,page,coaches=[],userId,cosmeticAccess=NO_CLAN_COSMETICS}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;title:string;posts:BoardListPost[];total:number;page:number;coaches?:ClanCoach[];userId:string;cosmeticAccess?:ClanCosmeticAccess}){
  const [editing,setEditing]=useState(false),[coachId,setCoachId]=useState("");
  const available=coaches.filter(c=>c.userId!==userId&&c.accepting);
  const request=(id:string)=>{setCoachId(id);setEditing(true);};
  const create=()=>{setCoachId("");setEditing(true);};
  const floating=(kind==="channels"||kind==="memories")&&posts.length>0;
  const createButton=<Button size="sm" className={floating?styles.collectionAction:undefined} disabled={kind==="feedback"&&!available.length} onClick={create}><Plus className="size-4" aria-hidden/>{kind==="memories"?"추억 남기기":kind==="feedback"?"피드백 신청":kind==="channels"?"채널 등록":"글 작성"}</Button>;
  return <section className={cn("space-y-5",floating&&"pb-16")} aria-label={title}>
    {kind==="feedback"&&<ClanCoachDirectory coaches={coaches} userId={userId} gameSlug={gameSlug} clanId={clanId} onRequest={request} requestAction={createButton}/>}
    {!posts.length?<div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center",kind==="memories"?"min-h-96":"min-h-64")}>{kind==="memories"?<Camera className="size-6 text-muted-foreground" aria-hidden/>:kind==="channels"?<Radio className="size-6 text-muted-foreground" aria-hidden/>:<MessageSquare className="size-6 text-muted-foreground" aria-hidden/>}<p className="text-sm">아직 등록된 {kind==="memories"?"추억":kind==="feedback"?"신청":kind==="channels"?"채널":"글"}이 없습니다.</p><p className="text-xs text-muted-foreground">{kind==="feedback"?"선생님을 선택해 첫 피드백을 요청해 보십시오.":kind==="channels"?"첫 방송 채널을 등록해 주십시오.":"첫 이야기를 남겨 주십시오."}</p>{kind!=="feedback"&&createButton}</div>
      :kind==="memories"?<MemoryGallery base={base} posts={posts} cosmeticAccess={cosmeticAccess}/>
      :kind==="channels"?<div className="grid gap-4 sm:grid-cols-2">{posts.map(p=>{const d=boardDetails(p.details);return <article key={p.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card"><div className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><ClanChannelStatus live={d.isLive===true}/><span className="text-[11px] text-muted-foreground">{boardChannels(d).length}개 플랫폼</span></div><Link prefetch={false} className="block break-words text-lg font-semibold leading-7 tracking-tight hover:text-primary" href={base+"/board/channels/"+p.id}>{p.title}</Link><div className="flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="size-3.5 shrink-0" aria-hidden/><span className="truncate">{p.author}</span></div><div className="flex items-start gap-2 text-sm leading-6"><Clock3 className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden/><p className="break-words">{d.schedule||"방송 시간 자유"}</p></div></div><div className="mt-auto border-t border-border bg-muted/15 p-4"><ClanChannelLinks channels={boardChannels(d)}/></div></article>;})}</div>
      :<BoardPostRows base={base} kind={kind} posts={posts} startNumber={total-(page-1)*BOARD_PAGE_SIZE} action={kind==="free"?createButton:undefined}/>}
    {floating&&createButton}
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} coaches={coaches.filter(c=>c.userId!==userId)} initialCoachId={coachId} cosmeticAccess={cosmeticAccess} onClose={()=>setEditing(false)}/>}
  </section>;
}
function BoardPostRows({base,kind,posts,startNumber,action}:{base:string;kind:BoardKind;posts:BoardListPost[];startNumber:number;action?:ReactNode}){
  const feedback=kind==="feedback";
  const columns=feedback?"md:grid-cols-[36px_72px_minmax(0,1fr)_132px_48px]":"md:grid-cols-[36px_minmax(0,1fr)_112px_104px_48px]";
  const status=(p:BoardListPost)=><span className={cn("inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 text-[11px] font-medium",p.status==="complete"?"bg-primary/10 text-primary":p.status==="answering"?"bg-sky-500/10 text-team-blue":"bg-muted text-muted-foreground")}>{FEEDBACK_STATUS[p.status as keyof typeof FEEDBACK_STATUS]}</span>;
  return <section className="min-h-64 overflow-hidden rounded-xl border border-border bg-card" aria-label={feedback?"피드백 신청 목록":"게시글 목록"}>
    {feedback?<div aria-hidden className={cn("hidden items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground md:grid",columns)}><span className="text-center">번호</span><span className="text-center">상태</span><span>신청 내용</span><span>담당 선생님</span><span className="text-center">댓글</span></div>:<div className="flex min-h-12 items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-2"><div className="flex items-center gap-3 text-[11px] text-muted-foreground md:gap-5"><span className="w-6 text-center md:w-9">번호</span><span>글 제목</span></div>{action}</div>}
    <ul className="divide-y divide-border">{posts.map((p,index)=><li key={p.id}>
      <Link href={base+"/board/"+kind+"/"+p.id} prefetch={false} className={cn("group grid min-h-20 grid-cols-[24px_minmax(0,1fr)_48px] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]",columns,!feedback&&"md:min-h-16 md:gap-x-5")}>
        <span aria-label={"게시글 번호 "+(startNumber-index)} className="col-start-1 row-start-1 row-span-2 text-center text-xs tabular-nums text-muted-foreground md:row-span-1">{startNumber-index}</span>
        {feedback&&<div className="hidden justify-center md:flex">{status(p)}</div>}
        <div className={cn("min-w-0",!feedback&&"md:contents")}><p className={cn("flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground",!feedback&&"md:contents")}><span className={cn("truncate",!feedback&&"md:col-start-3 md:row-start-1 md:text-center md:text-xs")}>{p.author}</span><span aria-hidden className={!feedback?"md:hidden":undefined}>·</span><time className={cn("shrink-0",!feedback&&"md:col-start-4 md:row-start-1 md:text-center md:text-xs md:tabular-nums")} dateTime={p.created_at}>{boardDate(p.created_at)}</time></p><div className={cn("mt-1.5 flex min-w-0 items-center gap-2",!feedback&&"md:col-start-2 md:row-start-1 md:mt-0")}>{feedback&&<span className="shrink-0 md:hidden">{status(p)}</span>}<p className="truncate text-sm font-semibold group-hover:text-primary"><ClanEmojiText text={p.title} large={false} className="whitespace-nowrap"/></p>{p.image_path&&<ImageIcon role="img" aria-label="이미지 첨부" className="size-3.5 shrink-0 text-muted-foreground"/>}</div></div>
        {feedback&&<div className="col-start-2 row-start-2 flex min-w-0 items-center gap-1.5 text-xs md:col-auto md:row-auto"><GraduationCap className="size-3.5 shrink-0 text-muted-foreground" aria-hidden/><span className={cn("truncate",p.coachName?"text-primary":"text-muted-foreground")}>{p.coachName||"미지정"}</span></div>}
        <span aria-label={"댓글 "+p.commentCount} className="col-start-3 row-start-1 row-span-2 flex items-center justify-center gap-1.5 rounded-md bg-muted/40 px-1 py-2 text-xs tabular-nums text-muted-foreground md:col-auto md:row-auto md:row-span-1"><MessageSquare className="size-3.5" aria-hidden/><span>{p.commentCount}</span></span>
      </Link>
    </li>)}</ul>
  </section>;
}
function MemoryGallery({base,posts,cosmeticAccess}:{base:string;posts:BoardListPost[];cosmeticAccess:ClanCosmeticAccess}){
  const gallery=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const root=gallery.current;if(!root)return;
    const cards=Array.from(root.children) as HTMLElement[];
    let frame=0,lastWidth=0;
    function arrange(){
      if(!root)return;
      lastWidth=root.getBoundingClientRect().width;
      const columns=Number(getComputedStyle(root).getPropertyValue("--columns"))||1;
      const width=(lastWidth-(columns-1)*8)/columns,heights=Array<number>(columns).fill(0);
      root.dataset.packed="true";
      const sizes=cards.map(card=>card.getBoundingClientRect().height);
      cards.forEach((card,index)=>{
        const column=heights.indexOf(Math.min(...heights));
        card.style.left=`${column*(width+8)}px`;card.style.top=`${heights[column]}px`;
        heights[column]+=sizes[index]+8;
      });
      root.style.height=`${Math.max(0,Math.max(...heights)-8)}px`;
    }
    arrange();
    const observer=new ResizeObserver(entries=>{
      if(entries.every(entry=>entry.target===root&&Math.abs(entry.contentRect.width-lastWidth)<1))return;
      cancelAnimationFrame(frame);frame=requestAnimationFrame(arrange);
    });
    observer.observe(root);cards.forEach(card=>observer.observe(card));
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[posts]);
  return <section aria-label="추억 앨범">
    <div ref={gallery} className={galleryStyles.grid}>{posts.map((p,i)=>{const photo=memoryStyle(boardDetails(p.details),cosmeticAccess);return <Link key={p.id} prefetch={false} href={base+"/board/memories/"+p.id} className={cn(galleryStyles.card,"focus-visible:outline-2 focus-visible:outline-primary")}>
      <MemoryPhoto src={boardImageUrl(base,p.id,true)} caption={p.content||p.title} footer={<><time dateTime={p.created_at}>{boardDate(p.created_at)}</time>{" · "+p.author}</>} frame={photo.photoFrame} sticker={photo.photoSticker} stickerPlacement={photo.photoStickerPlacement} stickers={photo.photoStickers} eager={i<2}/>
    </Link>;})}</div>
  </section>;
}
