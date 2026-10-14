"use client";
import { useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {Plus,Trash2} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { saveBoardPostAction } from "@/app/actions/clan-board";
import { BOARD_IMAGE_BUCKET,BOARD_IMAGE_LIMIT,STREAM_PLATFORMS,boardChannels,boardDetails,boardThumbnail,validateBoardInput,type BoardKind,type BoardPost,type BoardDetails } from "@/lib/clan/board";
import type {ClanCoach} from "@/lib/clan/coaching";
const textarea="board-scroll min-h-32 max-h-80 w-full resize-y rounded-lg border border-input bg-background p-4 text-base leading-7 focus-visible:outline-2 focus-visible:outline-ring sm:text-sm";

async function thumbnail(file:File):Promise<Blob>{
  const image=await createImageBitmap(file);
  try{
    if(image.width*image.height>80_000_000)throw new Error("사진 크기가 너무 큽니다. 작은 사진을 선택해 주세요.");
    const scale=Math.min(1,600/image.width,600/image.height);
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const context=canvas.getContext("2d");if(!context)throw new Error("사진 미리보기를 만들지 못했습니다.");
    context.drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("사진을 처리하지 못했습니다.")),"image/webp",.82));
  }finally{image.close();}
}
export function ClanBoardEditor({gameSlug,clanId,kind,post,onClose,coaches=[],initialCoachId=""}:{gameSlug:string;clanId:string;kind:BoardKind;post?:BoardPost;onClose:()=>void;coaches?:ClanCoach[];initialCoachId?:string}){
  const router=useRouter();
  const [id]=useState(()=>post?.id??crypto.randomUUID());
  const [title,setTitle]=useState(post?.title??"");
  const [content,setContent]=useState(post?.content??"");
  const [details,setDetails]=useState<BoardDetails>(post?boardDetails(post.details):{platform:"YouTube"});
  const [channels,setChannels]=useState(()=>{const old=boardChannels(details);return old.length?old:[{platform:"YouTube",url:""}];});
  const [coachId,setCoachId]=useState(post?.coach_id??initialCoachId);
  const [file,setFile]=useState<File|null>(null);
  const [pending,start]=useTransition();
  const set=(key:keyof BoardDetails,value:string)=>setDetails(current=>({...current,[key]:value}));
  const label=kind==="memories"?"추억 남기기":kind==="feedback"?"피드백 신청":kind==="channels"?"방송 채널 등록":"글 작성";
  const imageAllowed=(kind==="free"||kind==="memories")&&(!post||post.canReplaceImage);
  async function submit(){
    const realTitle=kind==="memories"?(title.trim()||content.trim().slice(0,80)||"추억 한 장"):title;
    const requestDetails=kind==="channels"?{channels,schedule:details.schedule??""}:kind==="memories"?{}:details;
    const invalid=validateBoardInput(kind,realTitle,content,requestDetails);
    if(invalid){toast.error(invalid);return;}
    if(kind==="memories"&&!file&&!post?.image_path){toast.error("추억 사진을 한 장 선택해 주세요.");return;}
    const client=createClient();let uploaded:string[]=[];
    try{
      let imagePath=post?.image_path??null;
      if(file){
        if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>BOARD_IMAGE_LIMIT)throw new Error("JPEG·PNG·WebP 사진을 5MB 이내로 선택해 주세요.");
        const preview=await thumbnail(file);
        const {data:{user}}=await client.auth.getUser();
        if(!user)throw new Error("다시 로그인해 주세요.");
        const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
        imagePath=clanId+"/"+user.id+"/"+id+"/"+crypto.randomUUID()+"."+ext;
        const original=await client.storage.from(BOARD_IMAGE_BUCKET).upload(imagePath,file,{contentType:file.type,upsert:false});
        if(original.error)throw new Error("사진을 올리지 못했습니다. 클랜 권한과 파일 크기를 확인해 주세요.");
        uploaded.push(imagePath);
        const small=await client.storage.from(BOARD_IMAGE_BUCKET).upload(boardThumbnail(imagePath),preview,{contentType:"image/webp",upsert:false});
        if(small.error)throw new Error("사진 미리보기를 올리지 못했습니다.");
        uploaded.push(boardThumbnail(imagePath));
      }
      const result=await saveBoardPostAction(gameSlug,clanId,{id,kind,title:realTitle,content,details:requestDetails,imagePath,editing:!!post,coachId:kind==="feedback"?coachId:null});
      if(!result.ok)throw new Error(result.error);
      uploaded=[];toast.success(post?"글을 수정했습니다.":"글을 등록했습니다.");if(result.warning)toast.warning(result.warning);
      onClose();if(!post)router.push("/games/"+gameSlug+"/clan/"+clanId+"/board/"+kind+"/"+id);
    }catch(error){
      if(uploaded.length){
        // A lost response can follow a committed post; never erase its attachment.
        const check=await client.from("clan_board_posts").select("image_path").eq("id",id).eq("clan_id",clanId).maybeSingle();
        if(!check.error&&!uploaded.includes(check.data?.image_path??"")){const cleaned=await client.storage.from(BOARD_IMAGE_BUCKET).remove(uploaded);if(cleaned.error)toast.warning("저장되지 않은 사진 파일 정리가 지연됐습니다.");}
      }
      toast.error(error instanceof Error?error.message:"저장하지 못했습니다. 작성 내용은 유지됩니다.");
    }
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!pending)onClose();}}><DialogContent className="board-scroll max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader className="border-b border-border pb-4"><DialogTitle>{post?kind==="channels"?"방송 채널 편집":"글 편집":label}</DialogTitle><DialogDescription>{kind==="memories"?"사진 한 장과 짧은 한마디로 함께한 시간을 남겨요.":kind==="channels"?"방송 이름과 플랫폼 링크를 등록하세요.":"이 클랜의 활성 멤버에게 공개됩니다."}</DialogDescription></DialogHeader><form className="space-y-5" onSubmit={event=>{event.preventDefault();start(submit);}}>
    {kind!=="memories"&&<div className="space-y-2"><Label htmlFor="board-title">제목</Label><Input id="board-title" value={title} maxLength={200} required disabled={pending} onChange={e=>setTitle(e.target.value)}/></div>}
    {kind==="feedback"&&<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="board-role">역할·영웅</Label><Input id="board-role" value={details.role??""} maxLength={100} required onChange={e=>set("role",e.target.value)} disabled={pending} placeholder="지원 · 아나"/></div><div className="space-y-2"><Label htmlFor="board-replay">리플레이 코드</Label><Input id="board-replay" value={details.replay??""} maxLength={12} onChange={e=>set("replay",e.target.value)} disabled={pending} placeholder="ABC123"/></div><div className="space-y-2"><Label htmlFor="board-video">영상 링크</Label><Input id="board-video" type="url" value={details.video??""} maxLength={1000} onChange={e=>set("video",e.target.value)} disabled={pending} placeholder="https://"/></div><div className="space-y-2"><Label htmlFor="board-moment">궁금한 장면·시간</Label><Input id="board-moment" value={details.moment??""} maxLength={100} onChange={e=>set("moment",e.target.value)} disabled={pending} placeholder="03:20 첫 한타"/></div></div>}
    {kind==="feedback"&&<div className="space-y-2"><Label htmlFor="board-coach">코칭 선생님</Label><select id="board-coach" value={coachId} required disabled={pending} onChange={e=>setCoachId(e.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">선생님을 선택해 주세요</option>{post?.coach_id&&!coaches.some(c=>c.userId===post.coach_id)&&<option value={post.coach_id}>{post.coachName||"이전 선생님"} · 기존 신청</option>}{coaches.filter(c=>c.accepting||c.userId===post?.coach_id).map(c=><option key={c.userId} value={c.userId}>{c.name} · {c.expertise}{!c.accepting?" (기존 신청)":""}</option>)}</select><p className="text-xs text-muted-foreground">신청하면 선생님에게 사이트 알림이 전달됩니다.</p></div>}
    {kind==="channels"&&<div className="space-y-4">{channels.map((c,i)=><div key={i} className="rounded-lg border border-border bg-muted/15 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">플랫폼 {i+1}</span>{channels.length>1&&<Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={"방송 채널 "+(i+1)+" 삭제"} title="방송 채널 삭제" className="-my-1 text-muted-foreground hover:text-destructive" onClick={()=>setChannels(old=>old.filter((_,n)=>n!==i))}><Trash2 className="size-3.5" aria-hidden/></Button>}</div><div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]"><div className="space-y-2"><Label htmlFor={"board-platform-"+i}>방송 플랫폼 {i+1}</Label><select id={"board-platform-"+i} className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={c.platform} onChange={e=>setChannels(old=>old.map((row,n)=>n===i?{...row,platform:e.target.value}:row))} disabled={pending}>{STREAM_PLATFORMS.map(v=><option key={v}>{v}</option>)}</select></div><div className="min-w-0 space-y-2"><Label htmlFor={"board-channel-"+i}>방송 채널 링크 {i+1}</Label><Input id={"board-channel-"+i} type="url" value={c.url} required maxLength={600} onChange={e=>setChannels(old=>old.map((row,n)=>n===i?{...row,url:e.target.value}:row))} disabled={pending} placeholder="https://"/></div></div></div>)}<Button type="button" size="sm" variant="outline" disabled={pending||channels.length>=4} onClick={()=>setChannels(old=>[...old,{platform:STREAM_PLATFORMS.find(p=>!old.some(c=>c.platform===p))??"YouTube",url:""}])}><Plus className="size-3.5" aria-hidden/>방송 플랫폼 추가</Button><div className="space-y-2"><Label htmlFor="board-schedule">방송 시간</Label><Input id="board-schedule" value={details.schedule??""} maxLength={100} onChange={e=>set("schedule",e.target.value)} disabled={pending} placeholder="화·목 저녁 8시"/></div></div>}
    {imageAllowed&&<div className="space-y-2"><Label htmlFor="board-photo">사진</Label><input id="board-photo" className="block w-full rounded-lg border border-input bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5" type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={e=>setFile(e.target.files?.[0]??null)}/><p className="text-xs text-muted-foreground">JPEG·PNG·WebP · 최대 5MB{post?.image_path?" · 선택하지 않으면 기존 사진 유지":""}</p></div>}
    {kind!=="channels"&&<div className="space-y-2"><Label htmlFor="board-content">{kind==="memories"?"사진 아래 한마디":kind==="feedback"?"궁금한 점":"본문"}</Label><textarea id="board-content" className={textarea} rows={kind==="memories"?3:6} value={content} maxLength={kind==="memories"?100:20000} required={kind==="free"||kind==="feedback"} onChange={e=>setContent(e.target.value)} disabled={pending}/><p className="text-right text-xs tabular-nums text-muted-foreground">{content.length} / {kind==="memories"?"100":"20,000"}자</p></div>}
    <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending}>{pending?"저장 중…":"저장"}</Button></div>
  </form></DialogContent></Dialog>;
}
