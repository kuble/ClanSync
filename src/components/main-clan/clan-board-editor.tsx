"use client";
import { useEffect,useRef,useState,useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {Plus,Trash2,ImagePlus,PenLine} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { saveBoardPostAction } from "@/app/actions/clan-board";
import { BOARD_IMAGE_BUCKET,BOARD_IMAGE_LIMIT,STREAM_PLATFORMS,boardChannels,boardDetails,boardThumbnail,validateBoardInput,type BoardKind,type BoardPost,type BoardDetails } from "@/lib/clan/board";
import type {ClanCoach} from "@/lib/clan/coaching";
import { NO_CLAN_COSMETICS, memoryStyle, type ClanCosmeticAccess } from "@/lib/clan/cosmetics";
import { boardImageUrl } from "@/lib/clan/board";
import { ClanEmojiInput } from "./clan-emoji-content";
import Image from "next/image";
import { MemoryPhoto } from "./memory-photo";
import { MemoryStickerEditor } from "./memory-sticker-editor";
import { MemoryCosmeticPicker } from "./memory-cosmetic-picker";
import { DEFAULT_STICKER_PLACEMENT } from "@/lib/clan/photo-sticker";


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
export function ClanBoardEditor({gameSlug,clanId,kind,post,onClose,coaches=[],initialCoachId="",cosmeticAccess=NO_CLAN_COSMETICS}:{gameSlug:string;clanId:string;kind:BoardKind;post?:BoardPost;onClose:()=>void;coaches?:ClanCoach[];initialCoachId?:string;cosmeticAccess?:ClanCosmeticAccess}){
  const router=useRouter();
  const [id]=useState(()=>post?.id??crypto.randomUUID());
  const [title,setTitle]=useState(post?.title??"");
  const [content,setContent]=useState(post?.content??"");
  const [details,setDetails]=useState<BoardDetails>(()=>{const old=post?boardDetails(post.details):{platform:"YouTube"};return {...old,...memoryStyle(old,cosmeticAccess)};});
  const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  useEffect(()=>()=>{if(photoPreview)URL.revokeObjectURL(photoPreview);},[photoPreview]);
  const [channels,setChannels]=useState(()=>{const old=boardChannels(details);return old.length?old:[{platform:"YouTube",url:""}];});
  const [coachId,setCoachId]=useState(post?.coach_id??initialCoachId);
  const [file,setFile]=useState<File|null>(null);
  const imageInput=useRef<HTMLInputElement>(null);
  const [pending,start]=useTransition();
  const set=(key:keyof BoardDetails,value:string)=>setDetails(current=>({...current,[key]:value}));
  const label=kind==="memories"?"추억 남기기":kind==="feedback"?"피드백 신청":kind==="channels"?"방송 채널 등록":"글 작성";
  const imageAllowed=(kind==="free"||kind==="memories")&&(!post||post.canReplaceImage);
  async function submit(){
    const realTitle=kind==="memories"?(title.trim()||content.trim().slice(0,80)||"추억 한 장"):title;
    const requestDetails=kind==="channels"?{channels,schedule:details.schedule??""}:kind==="memories"?{photoFrame:details.photoFrame??"classic",photoSticker:details.photoSticker??"none",...(details.photoSticker&&details.photoSticker!=="none"?{photoStickerPlacement:details.photoStickerPlacement??DEFAULT_STICKER_PLACEMENT}:{})}:details;
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
  const attachment=imageAllowed&&<div className="space-y-3"><input ref={imageInput} id="board-photo" aria-label="사진" hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={event=>{const next=event.target.files?.[0]??null;setFile(next);setPhotoPreview(next?URL.createObjectURL(next):null);}}/><div className="flex flex-wrap items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={pending} className="gap-2 rounded-lg border-dashed text-muted-foreground" onClick={()=>imageInput.current?.click()}><ImagePlus className="size-4 text-primary" aria-hidden/>사진 첨부</Button><span className="text-[11px] text-muted-foreground">PNG · JPG · WebP · 5MB</span></div>{(file||post?.image_path)&&<div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3">{(photoPreview||post?.image_path)&&<Image unoptimized src={photoPreview||(post?boardImageUrl(`/games/${gameSlug}/clan/${clanId}`,post.id,true):"")} alt="첨부 사진 미리보기" width={64} height={48} className="h-12 w-16 rounded-lg object-cover"/>}<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{file?.name??"기존 사진"}</span>{file&&<Button type="button" variant="ghost" size="icon-sm" aria-label="파일 선택 취소" disabled={pending} onClick={()=>{setFile(null);setPhotoPreview(null);if(imageInput.current)imageInput.current.value="";}}><Trash2 className="size-3.5" aria-hidden/></Button>}</div>}</div>;
  return <Sheet open onOpenChange={open=>{if(!open&&!pending)onClose();}}><SheetContent showCloseButton={!pending} className="gap-0 overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-[680px]"><SheetHeader className="shrink-0 border-b border-border/60 px-6 py-5 pr-12"><span className="mb-2 grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><PenLine className="size-4" aria-hidden/></span><SheetTitle className="text-lg font-semibold tracking-tight">{post?kind==="channels"?"방송 채널 편집":"글 편집":label}</SheetTitle><SheetDescription>{kind==="memories"?"사진 한 장과 짧은 한마디로 함께한 시간을 남겨요.":kind==="channels"?"방송 이름과 플랫폼 링크를 등록하세요.":"이 클랜의 활성 멤버에게 공개됩니다."}</SheetDescription></SheetHeader><form className="flex min-h-0 flex-1 flex-col" onSubmit={event=>{event.preventDefault();start(submit);}}><fieldset disabled={pending} className="board-scroll min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 pb-6 pt-6">
    {kind!=="memories"&&<div className={kind==="free"?"border-b border-border/60 pb-5":"space-y-2"}><Label htmlFor="board-title" className={kind==="free"?"sr-only":undefined}>제목</Label><Input placeholder="제목을 입력해 주세요" className={kind==="free"?"h-auto rounded-none border-0 bg-transparent dark:bg-transparent px-0 py-1 text-xl! font-semibold tracking-tight shadow-none ring-0 placeholder:font-normal focus-visible:border-transparent focus-visible:ring-0":undefined} id="board-title" value={title} maxLength={200} required disabled={pending} onChange={e=>setTitle(e.target.value)}/></div>}
    {kind==="feedback"&&<div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="board-role">역할·영웅</Label><Input id="board-role" value={details.role??""} maxLength={100} required onChange={e=>set("role",e.target.value)} disabled={pending} placeholder="지원 · 아나"/></div><div className="space-y-2"><Label htmlFor="board-replay">리플레이 코드</Label><Input id="board-replay" value={details.replay??""} maxLength={12} onChange={e=>set("replay",e.target.value)} disabled={pending} placeholder="ABC123"/></div><div className="space-y-2"><Label htmlFor="board-video">영상 링크</Label><Input id="board-video" type="url" value={details.video??""} maxLength={1000} onChange={e=>set("video",e.target.value)} disabled={pending} placeholder="https://"/></div><div className="space-y-2"><Label htmlFor="board-moment">궁금한 장면·시간</Label><Input id="board-moment" value={details.moment??""} maxLength={100} onChange={e=>set("moment",e.target.value)} disabled={pending} placeholder="03:20 첫 한타"/></div></div>}
    {kind==="feedback"&&<div className="space-y-2"><Label htmlFor="board-coach">코칭 선생님</Label><select id="board-coach" value={coachId} required disabled={pending} onChange={e=>setCoachId(e.target.value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">선생님을 선택해 주세요</option>{post?.coach_id&&!coaches.some(c=>c.userId===post.coach_id)&&<option value={post.coach_id}>{post.coachName||"이전 선생님"} · 기존 신청</option>}{coaches.filter(c=>c.accepting||c.userId===post?.coach_id).map(c=><option key={c.userId} value={c.userId}>{c.name} · {c.expertise}{!c.accepting?" (기존 신청)":""}</option>)}</select><p className="text-xs text-muted-foreground">신청하면 선생님에게 사이트 알림이 전달됩니다.</p></div>}
    {kind==="channels"&&<div className="space-y-4">{channels.map((c,i)=><div key={i} className="rounded-lg border border-border bg-muted/15 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">플랫폼 {i+1}</span>{channels.length>1&&<Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={"방송 채널 "+(i+1)+" 삭제"} title="방송 채널 삭제" className="-my-1 text-muted-foreground hover:text-destructive" onClick={()=>setChannels(old=>old.filter((_,n)=>n!==i))}><Trash2 className="size-3.5" aria-hidden/></Button>}</div><div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]"><div className="space-y-2"><Label htmlFor={"board-platform-"+i}>방송 플랫폼 {i+1}</Label><select id={"board-platform-"+i} className="min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={c.platform} onChange={e=>setChannels(old=>old.map((row,n)=>n===i?{...row,platform:e.target.value}:row))} disabled={pending}>{STREAM_PLATFORMS.map(v=><option key={v}>{v}</option>)}</select></div><div className="min-w-0 space-y-2"><Label htmlFor={"board-channel-"+i}>방송 채널 링크 {i+1}</Label><Input id={"board-channel-"+i} type="url" value={c.url} required maxLength={600} onChange={e=>setChannels(old=>old.map((row,n)=>n===i?{...row,url:e.target.value}:row))} disabled={pending} placeholder="https://"/></div></div></div>)}<Button type="button" size="sm" variant="outline" disabled={pending||channels.length>=4} onClick={()=>setChannels(old=>[...old,{platform:STREAM_PLATFORMS.find(p=>!old.some(c=>c.platform===p))??"YouTube",url:""}])}><Plus className="size-3.5" aria-hidden/>방송 플랫폼 추가</Button><div className="space-y-2"><Label htmlFor="board-schedule">방송 시간</Label><Input id="board-schedule" value={details.schedule??""} maxLength={100} onChange={e=>set("schedule",e.target.value)} disabled={pending} placeholder="화·목 저녁 8시"/></div></div>}
    {kind==="memories"&&attachment}
    {kind==="memories"&&<section className="space-y-3" aria-label="사진 꾸미기"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-medium">사진 꾸미기</h4><Link className="text-xs text-primary hover:underline" href={`/games/${gameSlug}/clan/${clanId}/store`}>꾸미기 구매</Link></div><MemoryCosmeticPicker src={photoPreview||(post?boardImageUrl(`/games/${gameSlug}/clan/${clanId}`,post.id,true):null)} frame={details.photoFrame??"classic"} sticker={details.photoSticker??"none"} access={cosmeticAccess} onFrame={value=>set("photoFrame",value)} onSticker={value=>set("photoSticker",value)}/>{cosmeticAccess.stickers?<MemoryStickerEditor src={photoPreview||(post?boardImageUrl(`/games/${gameSlug}/clan/${clanId}`,post.id,true):null)} caption={content} frame={details.photoFrame} sticker={details.photoSticker??"none"} placement={details.photoStickerPlacement} onChange={placement=>setDetails(current=>({...current,photoStickerPlacement:placement}))}/>:<div className="mx-auto w-full max-w-72"><MemoryPhoto src={photoPreview||(post?boardImageUrl(`/games/${gameSlug}/clan/${clanId}`,post.id,true):null)} caption={content} frame={details.photoFrame}/></div>}</section>}
    {kind!=="channels"&&<div className="space-y-2"><Label className={kind==="free"?"sr-only":undefined} htmlFor="board-content">{kind==="memories"?"글":kind==="feedback"?"궁금한 점":"본문"}</Label><ClanEmojiInput id="board-content" label={kind==="memories"?"글":kind==="feedback"?"궁금한 점":"본문"} value={content} onChange={setContent} maxLength={kind==="memories"?100:20000} disabled={pending} variant={kind==="free"?"post":"comment"} placeholder={kind==="memories"?"사진에 담긴 이야기를 남겨보세요.":kind==="feedback"?"어떤 점이 궁금한가요?":"오늘 클랜원과 나누고 싶은 이야기를 적어보세요."} className={kind==="memories"?"min-h-20":undefined}/></div>}
    {kind==="free"&&attachment}
    </fieldset><div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 bg-card/40 px-6 py-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>취소</Button><Button type="submit" disabled={pending}>{pending?"저장 중…":"저장"}</Button></div>
  </form></SheetContent></Sheet>;
}
