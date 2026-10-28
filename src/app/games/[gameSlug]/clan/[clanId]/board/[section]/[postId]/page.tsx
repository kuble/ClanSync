import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import { forbidden,notFound } from "next/navigation";
import { getRequestClient } from "@/lib/supabase/request";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { loadBoardArticle } from "@/lib/clan/load-clan-board";
import {loadClanCoaches} from "@/lib/clan/load-clan-coaches";
import { isBoardKind,uuidPattern } from "@/lib/clan/board";
import { ClanBoardArticle } from "@/components/main-clan/clan-board-article";
import { loadClanCosmeticAccess } from "@/lib/clan/load-clan-cosmetics";
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
    return <div className="space-y-5"><Link href={base+"/board/notices"} className="inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden/>클랜 공지 및 규칙</Link><article className="overflow-hidden rounded-xl border border-border bg-card"><header className="border-b border-border px-5 py-6 sm:px-7"><h3 className="break-words text-xl font-semibold leading-8 tracking-tight sm:text-2xl">{result.data.title}</h3><time dateTime={result.data.created_at} className="mt-4 block text-xs text-muted-foreground">{new Date(result.data.created_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</time></header><div className="p-5 sm:p-7"><div className="max-w-[68ch] whitespace-pre-wrap break-words text-[15px] leading-8">{result.data.content}</div></div></article></div>;
  }
  if(!isBoardKind(section))notFound();
  const commentPage=/^[1-9]\d{0,4}$/.test(query.comments??"")?Number(query.comments):1;
  const data=await loadBoardArticle(clanId,section,postId,commentPage);
  if(!data)notFound();
  const coaches=section==="feedback"&&data.post.canManage?await loadClanCoaches(clanId):[];
  const client=await getRequestClient();
  const [cosmeticAccess,emojis,emojiReactions]=await Promise.all([loadClanCosmeticAccess(clanId),client.from("clan_emojis").select("id,name").eq("clan_id",clanId).order("created_at"),client.rpc("clan_emoji_reaction_counts",{p_post_id:postId})]);
  return <ClanBoardArticle key={data.userId+postId} base={base} gameSlug={gameSlug} clanId={clanId} kind={section} {...data} commentPage={commentPage} coaches={coaches} cosmeticAccess={cosmeticAccess} emojis={emojis.data??[]} emojiReactions={emojiReactions.data??[]}/>;
}
