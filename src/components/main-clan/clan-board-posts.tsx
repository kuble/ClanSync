"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef,useState } from "react";
import { ArrowLeft,ArrowRight,Camera,Plus,Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClanBoardEditor } from "./clan-board-editor";
import { boardDetails,boardImageUrl,safeBoardUrl,FEEDBACK_STATUS,type BoardKind,type BoardPost } from "@/lib/clan/board";
import { cn } from "@/lib/utils";
import styles from "./clan-collection.module.css";
const date=(value:string)=>new Date(value).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"});
export function ClanBoardPosts({base,gameSlug,clanId,kind,title,description,posts}:{base:string;gameSlug:string;clanId:string;kind:BoardKind;title:string;description:string;posts:BoardPost[]}){
  const [editing,setEditing]=useState(false);
  return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Button size="sm" onClick={()=>setEditing(true)}><Plus className="size-4"/>{kind==="memories"?"추억 남기기":kind==="feedback"?"피드백 신청":kind==="channels"?"채널 소개":"글 작성"}</Button></header>
    {!posts.length?<div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center"><Camera className="size-6 text-muted-foreground" aria-hidden/><p className="text-sm">아직 등록된 {kind==="memories"?"추억":kind==="feedback"?"신청":kind==="channels"?"채널":"글"}이 없어요.</p><p className="text-xs text-muted-foreground">첫 이야기를 남겨 주세요.</p></div>
      :kind==="memories"?<MemoryGallery base={base} posts={posts}/>
      :kind==="channels"?<div className="grid gap-4 sm:grid-cols-2">{posts.map(p=>{const d=boardDetails(p.details),url=safeBoardUrl(d.channel);return <article key={p.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><Radio className="size-5 text-primary" aria-hidden/><span className="text-xs text-muted-foreground">{d.platform}</span></div><Link className="text-base font-semibold hover:text-primary" href={base+"/board/channels/"+p.id}>{p.title}</Link><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{p.content}</p><p className="text-xs">{d.schedule||"방송 시간 자유"} · {p.author}</p>{url&&<a href={url} target="_blank" rel="noopener noreferrer" className="mt-auto text-sm font-medium text-primary">방송 채널 열기 ↗</a>}</article>;})}</div>
      :<div className="min-h-96 rounded-xl border border-border bg-card px-5"><ul className="divide-y divide-border">{posts.map(p=><li key={p.id}><Link href={base+"/board/"+kind+"/"+p.id} prefetch={false} className="flex min-h-24 items-center gap-3 py-4"><div className="min-w-0 flex-1">{kind==="feedback"&&<span className={cn("mb-2 inline-block rounded-md px-2 py-1 text-[11px]",p.status==="complete"?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>{FEEDBACK_STATUS[p.status as keyof typeof FEEDBACK_STATUS]}</span>}<p className="truncate text-sm font-medium">{p.title}</p><p className="mt-2 text-xs text-muted-foreground">{p.author} · {date(p.created_at)} · 댓글 {p.commentCount}</p></div>{p.image_path&&<Image unoptimized src={boardImageUrl(base,p.id,true)} width={64} height={64} alt="첨부 사진" className="size-16 rounded-lg object-cover"/>}</Link></li>)}</ul></div>}
    {editing&&<ClanBoardEditor gameSlug={gameSlug} clanId={clanId} kind={kind} onClose={()=>setEditing(false)}/>}
  </div>;
}
function MemoryGallery({base,posts}:{base:string;posts:BoardPost[]}){
  const [index,setIndex]=useState(0),[all,setAll]=useState(false);
  const start=useRef<number|null>(null),dragged=useRef(false);
  const selected=index%posts.length;
  const move=(delta:number)=>setIndex(v=>(v+delta+posts.length)%posts.length);
  const photo=(p:BoardPost)=>{const d=boardDetails(p.details);return <><Image unoptimized src={boardImageUrl(base,p.id,true)} width={600} height={450} alt={p.content||p.title} className={styles.memoryImage}/><span className={styles.memoryCaption}>{p.content||p.title}</span><span className={styles.memoryDate}>{d.takenAt||date(p.created_at)} · {p.author}</span></>;};
  return <section className="space-y-4" aria-label="추억 앨범"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">사진 한 장에 담긴 우리 이야기</p><Button variant="outline" size="sm" aria-pressed={all} onClick={()=>setAll(!all)}>{all?"앨범으로 보기":"전체 보기"}</Button></div>
    {all?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{posts.map((p,i)=><Link key={p.id} href={base+"/board/memories/"+p.id} className={styles.polaroid} style={{transform:"rotate("+(i%3-1)*2+"deg)"}}>{photo(p)}</Link>)}</div>
      :<><div className={styles.memoryStage} onPointerDown={e=>{start.current=e.clientX;dragged.current=false;}} onPointerUp={e=>{if(start.current!==null&&Math.abs(e.clientX-start.current)>35){dragged.current=true;move(e.clientX<start.current?1:-1);}start.current=null;}} onPointerCancel={()=>{start.current=null;}} onClickCapture={e=>{if(dragged.current){e.preventDefault();dragged.current=false;}}} onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();move(e.key==="ArrowLeft"?-1:1);}}}>
        {[-1,0,1].filter(side=>posts.length>2||side===0||(posts.length===2&&side===1)).map(side=>{const p=posts[(selected+side+posts.length)%posts.length];return side===0?<Link key="center" href={base+"/board/memories/"+p.id} className={cn(styles.polaroid,styles.memoryCenter)}>{photo(p)}</Link>:<button key={side} type="button" className={cn(styles.polaroid,side<0?styles.memoryLeft:styles.memoryRight)} aria-label={(side<0?"이전 추억: ":"다음 추억: ")+p.title} onClick={()=>move(side)}>{photo(p)}</button>;})}
      </div><div className="flex items-center justify-center gap-5"><Button variant="outline" size="icon" disabled={posts.length<2} aria-label="이전 추억" onClick={()=>move(-1)}><ArrowLeft/></Button><span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">{selected+1} / {posts.length}</span><Button variant="outline" size="icon" disabled={posts.length<2} aria-label="다음 추억" onClick={()=>move(1)}><ArrowRight/></Button></div></>}
  </section>;
}
