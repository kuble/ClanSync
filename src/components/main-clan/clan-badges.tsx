"use client";
import Link from "next/link";
import Image from "next/image";
import {useEffect,useRef,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {Cake,Flame,ShieldCheck,Sparkles,Swords,Star} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {setFeaturedBadgesAction,acknowledgeBadgesAction} from "@/app/actions/clan-badges";
import {type ClanBadge,type ClanBadgeCollection,type ClanBadgeKey} from "@/lib/clan/badges";
import {cn} from "@/lib/utils";
import styles from "./clan-collection.module.css";
const icons={flame:Flame,swords:Swords,shield:ShieldCheck,sparkles:Sparkles,cake:Cake};
export function ClanBadges({collection,gameSlug,clanId,compact=false,canManage=false,className}:{collection:ClanBadgeCollection;gameSlug:string;clanId:string;compact?:boolean;canManage?:boolean;className?:string}){
  const router=useRouter(),[pending,start]=useTransition();
  const [selectedKey,setSelectedKey]=useState<ClanBadgeKey|null>(null),[group,setGroup]=useState("전체");
  const selected=collection.badges.find(b=>b.key===selectedKey)??null;
  const featured=collection.featured??collection.badges.filter(b=>b.earned).slice(0,3).map(b=>b.key);
  const badges=compact?featured.flatMap(key=>collection.badges.filter(b=>b.key===key)):collection.badges.filter(b=>group==="전체"||b.group===group);
  const fresh=collection.badges.filter(b=>b.isNew);
  const caseRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(compact)return;
    for(const badge of collection.badges.filter(b=>b.isNew)){
      const emblem=caseRef.current?.querySelector<HTMLElement>(`[data-badge="${badge.key}"] [data-emblem]`);
      if(!emblem)continue;
      const key=`clansync:badge-motion:${collection.userId}:${clanId}:${badge.key}:${badge.awardedAt}`;
      try{if(localStorage.getItem(key))continue;localStorage.setItem(key,"seen");}catch{continue;}
      if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        emblem.animate([{transform:"translateY(-12px) scale(1.12)",opacity:.4},{transform:"translateY(0) scale(1)",opacity:1}],{duration:550,easing:"ease"});
    }
  },[collection,clanId,compact,group]);
  function feature(key:ClanBadgeKey){
    const next=featured.includes(key)?featured.filter(k=>k!==key):[...featured,key];
    if(next.length>3){toast.error("대표 배지는 최대 3개예요. 다른 배지를 먼저 해제해 주세요.");return;}
    start(async()=>{try{const result=await setFeaturedBadgesAction(gameSlug,clanId,next);if(!result.ok){toast.error(result.error);return;}toast.success("대표 배지를 저장했습니다.");router.refresh();}catch{toast.error("대표 배지를 저장하지 못했습니다.");}});
  }
  return <div className={cn("space-y-4",className)}>
    {!compact&&<><div className="flex flex-wrap gap-2" aria-label="배지 컬렉션">{["전체","기념","정규 내전","깜짝 내전"].map(value=><Button key={value} size="sm" variant={group===value?"default":"outline"} aria-pressed={group===value} onClick={()=>setGroup(value)}>{value}</Button>)}</div>{fresh.length>0&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/10 p-3 text-sm"><span role="status">새로 획득한 배지 {fresh.length}개</span><Button size="sm" variant="ghost" disabled={pending} onClick={()=>start(async()=>{try{const result=await acknowledgeBadgesAction(gameSlug,clanId);if(!result.ok)toast.error(result.error);else router.refresh();}catch{toast.error("확인 상태를 저장하지 못했습니다.");}})}>획득 확인</Button></div>}</>}
    <div className={styles.case}><div className={styles.casePlate}><span className="font-semibold">{collection.clanName}</span><span className="text-muted-foreground">{compact?"대표 진열":"함께 쌓은 시간"}</span></div><div ref={caseRef} className={cn(styles.caseGrid,compact&&styles.compactGrid)}>{badges.map(b=><button key={b.key} data-badge={b.key} type="button" aria-label={b.name+" "+(b.earned?"획득":"미획득")} aria-pressed={selectedKey===b.key} className={cn(styles.pin,!b.earned&&styles.empty,!compact&&b.isNew&&styles.newPin)} onClick={()=>setSelectedKey(b.key)}><BadgeEmblem badge={b}/><span className={styles.pinName}>{b.name}</span><span className={styles.pinDetail}>{b.earned?"획득":b.progress}</span><span className={styles.pinDetail}>{featured.includes(b.key)&&b.earned?"대표 배지":b.earned?"달성":"미달성"}</span></button>)}</div></div>
    {compact?<Link href={"/games/"+gameSlug+"/clan/"+clanId+"/badges"} className="inline-flex text-xs font-medium text-primary">배지 케이스 보기 →</Link>:<p className="text-xs leading-6 text-muted-foreground">내전 배지는 종료된 회차를 기준으로 합니다. 기록 정정으로 조건에 미달하면 다시 미획득으로 표시됩니다.</p>}
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelectedKey(null);}}><DialogContent><DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>{selected?.story}</DialogDescription></DialogHeader>{selected&&<BadgeDetail badge={selected} featured={featured.includes(selected.key)} canManage={!compact&&canManage} pending={pending} onFeature={()=>feature(selected.key)}/>}</DialogContent></Dialog>
  </div>;
}
function BadgeEmblem({badge,detail=false}:{badge:ClanBadge;detail?:boolean}){
  const Icon=icons[badge.icon],isFounding=badge.key==="founding";
  return <span data-emblem className={cn(styles.emblem,isFounding&&styles.artwork,isFounding&&detail&&styles.detailArtwork,detail&&!badge.earned&&"opacity-50")}>
    {isFounding?<Image src="/clan-badges/founding-first-banner.png" alt="" width={144} height={144} sizes={detail?"144px":"60px"} className={styles.badgeImage}/>:<Icon className={detail?"size-7":"size-6"} aria-hidden/>}
  </span>;
}
function BadgeDetail({badge,featured,canManage,pending,onFeature}:{badge:ClanBadge;featured:boolean;canManage:boolean;pending:boolean;onFeature:()=>void}){
  return <div className="space-y-4"><div className="flex items-center gap-4"><BadgeEmblem badge={badge} detail/><div><p className="text-sm">{badge.group} · {badge.earned?"획득":"미획득"}</p><p className="mt-1 text-xs text-muted-foreground">{badge.target?"종료된 "+badge.group+" "+badge.target+"회":badge.key==="founding"?"클랜 창단":"클랜 창단 1주년"}</p></div></div><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>진행도</dt><dd>{badge.progress}</dd></div><div className="flex justify-between"><dt>{badge.earned?"획득일":"예정"}</dt><dd>{badge.earned?(badge.earnedAt?new Date(badge.earnedAt).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"}):"확인 필요"):badge.target?"아직 미획득":badge.progress}</dd></div></dl>{canManage&&badge.earned&&<Button variant="outline" disabled={pending} onClick={onFeature}><Star className={cn("size-4",featured&&"fill-primary text-primary")}/>{featured?"대표 배지 해제":"대표 배지 지정"}</Button>}</div>;
}
