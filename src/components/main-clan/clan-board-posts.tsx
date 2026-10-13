"use client";
import Image from "next/image";
import Link from "next/link";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {Camera,Plus,Radio} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ClanBoardEditor} from "./clan-board-editor";
import {ClanCoachDirectory} from "./clan-coach-directory";
import {ClanChannelLinks} from "./clan-channel-links";
import {CircularCarousel} from "./circular-carousel";
import {boardChannels,boardDate,boardDetails,boardImageUrl,FEEDBACK_STATUS,type BoardKind,type BoardPost} from "@/lib/clan/board";
import type {ClanCoach} from "@/lib/clan/coaching";
import {cn} from "@/lib/utils";
import styles from "./clan-collection.module.css";

export function ClanBoardPosts({base,gameSlug,clanId,kind,title,description,posts,coaches=[],userId}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;title:string;description:string;posts:BoardPost[];coaches?:ClanCoach[];userId:string}){
  const [editing,setEditing]=useState(false),[coachId,setCoachId]=useState("");
  const available=coaches.filter(c=>c.userId!==userId&&c.accepting);
  const request=(id:string)=>{setCoachId(id);setEditing(true);};
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Button size="sm" disabled={kind==="feedback"&&!available.length} onClick={()=>{setCoachId("");setEditing(true);}}><Plus className="size-4"/>{kind==="memories"?"추억 남기기":kind==="feedback"?"피드백 신청":kind==="channels"?"채널 소개":"글 작성"}</Button></header>
    {kind==="feedback"&&<ClanCoachDirectory coaches={coaches} userId={userId} gameSlug={gameSlug} clanId={clanId} onRequest={request}/>}
    {!posts.length?<div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center"><Camera className="size-6 text-muted-foreground" aria-hidden/><p className="text-sm">아직 등록된 {kind==="memories"?"추억":kind==="feedback"?"신청":kind==="channels"?"채널":"글"}이 없어요.</p><p className="text-xs text-muted-foreground">{kind==="feedback"?"선생님을 선택해 첫 피드백을 요청해 보세요.":"첫 이야기를 남겨 주세요."}</p></div>
      :kind==="memories"?<MemoryGallery base={base} posts={posts}/>
      :kind==="channels"?<div className="grid gap-4 sm:grid-cols-2">{posts.map(p=>{const d=boardDetails(p.details);return <article key={p.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><Radio className="size-5 text-primary" aria-hidden/><span className="text-xs text-muted-foreground">{boardChannels(d).length}개 플랫폼</span></div><Link className="text-base font-semibold hover:text-primary" href={base+"/board/channels/"+p.id}>{p.title}</Link><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{p.content}</p><p className="text-xs">{d.schedule||"방송 시간 자유"} · {p.author}</p><div className="mt-auto"><ClanChannelLinks base={base} postId={p.id} channels={boardChannels(d)}/></div></article>;})}</div>
      :<div className="min-h-96 rounded-xl border border-border bg-card px-5"><ul className="divide-y divide-border">{posts.map(p=><li key={p.id}><Link href={base+"/board/"+kind+"/"+p.id} prefetch={false} className="flex min-h-24 items-center gap-3 py-4"><div className="min-w-0 flex-1">{kind==="feedback"&&<span className={cn("mb-2 inline-block rounded-md px-2 py-1 text-[11px]",p.status==="complete"?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>{FEEDBACK_STATUS[p.status as keyof typeof FEEDBACK_STATUS]}</span>}<p className="truncate text-sm font-medium">{p.title}</p>{kind==="feedback"&&<p className="mt-1 text-xs text-primary">{p.coachName?`${p.coachName} 선생님께 신청`:"선생님 미지정 (이전 신청)"}</p>}<p className="mt-2 text-xs text-muted-foreground">{p.author} · {boardDate(p.created_at)} · 댓글 {p.commentCount}</p></div>{p.image_path&&<Image unoptimized src={boardImageUrl(base,p.id,true)} width={64} height={64} alt="첨부 사진" className="size-16 rounded-lg object-cover"/>}</Link></li>)}</ul></div>}
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} coaches={coaches.filter(c=>c.userId!==userId)} initialCoachId={coachId} onClose={()=>setEditing(false)}/>}
  </div>;
}
function MemoryGallery({base,posts}:{base:string;posts:BoardPost[]}){
  const router=useRouter(),[all,setAll]=useState(false);
  const items=useMemo(()=>posts.map(p=>{
    const d=boardDetails(p.details);
    return {id:p.id,label:p.content||p.title,content:<><Image key={p.id} unoptimized loading="eager" draggable={false} src={boardImageUrl(base,p.id,true)} width={600} height={450} alt={p.content||p.title} className={styles.memoryImage}/><span className={styles.memoryCaption}>{p.content||p.title}</span><span className={styles.memoryDate}>{d.takenAt||boardDate(p.created_at)} · {p.author}</span></>};
  }),[base,posts]);
  return <section className="space-y-4" aria-label="추억 앨범"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">사진 한 장에 담긴 우리 이야기</p><Button variant="outline" size="sm" aria-pressed={all} onClick={()=>setAll(!all)}>{all?"앨범으로 보기":"전체 보기"}</Button></div>
    {all?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item,i)=><Link key={item.id} href={base+"/board/memories/"+item.id} className={styles.polaroid} style={{transform:"rotate("+(i%3-1)*2+"deg)"}}>{item.content}</Link>)}</div>:<CircularCarousel items={items} onItemClick={id=>router.push(base+"/board/memories/"+id)}/>}
  </section>;
}
