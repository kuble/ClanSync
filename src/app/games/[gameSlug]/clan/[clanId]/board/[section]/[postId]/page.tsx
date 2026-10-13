import Link from "next/link";
import { forbidden,notFound } from "next/navigation";
import { getRequestClient } from "@/lib/supabase/request";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { loadBoardArticle } from "@/lib/clan/load-clan-board";
import {loadClanCoaches} from "@/lib/clan/load-clan-coaches";
import { isBoardKind,uuidPattern } from "@/lib/clan/board";
import { ClanBoardArticle } from "@/components/main-clan/clan-board-article";
export default async function PostPage({params,searchParams}:{params:Promise<{gameSlug:string;clanId:string;section:string;postId:string}>;searchParams:Promise<{comments?:string}>}) {
  const [{gameSlug,clanId,section,postId},query]=await Promise.all([params,searchParams]);
  if(!uuidPattern.test(postId))notFound();
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  const base="/games/"+gameSlug+"/clan/"+clanId;
  if(section==="notices"){
    const client=await getRequestClient();
    const result=await client.from("clan_notices").select("title,content,created_at").eq("id",postId).eq("clan_id",clanId).maybeSingle();
    if(result.error)throw new Error("공지를 불러오지 못했습니다.");
    if(!result.data)notFound();
    return <article className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-7"><Link href={base+"/board/notices"} className="text-sm text-muted-foreground">← 클랜 공지 및 규칙</Link><h3 className="text-xl font-semibold">{result.data.title}</h3><p className="text-xs text-muted-foreground">{new Date(result.data.created_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</p><div className="whitespace-pre-wrap break-words text-sm leading-7">{result.data.content}</div></article>;
  }
  if(!isBoardKind(section))notFound();
  const commentPage=/^[1-9]\d{0,4}$/.test(query.comments??"")?Number(query.comments):1;
  const [data,coaches]=await Promise.all([loadBoardArticle(clanId,section,postId,commentPage),section==="feedback"?loadClanCoaches(clanId):Promise.resolve([])]);
  if(!data)notFound();
  return <ClanBoardArticle key={data.userId+postId} base={base} gameSlug={gameSlug} clanId={clanId} kind={section} {...data} commentPage={commentPage} coaches={coaches}/>;
}
