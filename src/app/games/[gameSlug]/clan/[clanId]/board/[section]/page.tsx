import { forbidden,notFound } from "next/navigation";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getRequestClient } from "@/lib/supabase/request";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { loadClanBoard } from "@/lib/clan/load-clan-board";
import { BOARD_SECTIONS, BOARD_PAGE_SIZE, isBoardKind } from "@/lib/clan/board";
import { ClanManageNotices,ClanManageRules } from "@/components/main-clan/clan-manage-notices";
import { ClanBoardPosts } from "@/components/main-clan/clan-board-posts";
export default async function BoardSectionPage({params,searchParams}:{params:Promise<{gameSlug:string;clanId:string;section:string}>;searchParams:Promise<{page?:string}>}) {
  const [{gameSlug,clanId,section},query]=await Promise.all([params,searchParams]);
  const room=BOARD_SECTIONS.find(s=>s.key===section);
  if(!room)notFound();
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  const base="/games/"+gameSlug+"/clan/"+clanId;
  if(section==="notices"){
    const client: SupabaseClient<Database>=await getRequestClient();
    const [notices,profile,names]=await Promise.all([
      client.from("clan_notices").select("id,title,content,is_pinned,created_at,created_by").eq("clan_id",clanId).order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(100),
      client.from("clans").select("rules").eq("id",clanId).maybeSingle(),
      client.rpc("clan_peer_nicknames",{p_clan_id:clanId}),
    ]);
    const nicknames=new Map((names.data??[]).map(n=>[n.user_id,n.nickname]));
    return <div className="space-y-5"><ClanManageRules gameSlug={gameSlug} clanId={clanId} canManage={ctx.role!=="member"} initialRules={profile.data?.rules??null} loadFailed={!!profile.error||!profile.data}/><ClanManageNotices gameSlug={gameSlug} clanId={clanId} canManage={ctx.role!=="member"} loadFailed={!!notices.error||!!names.error} notices={(notices.data??[]).map(n=>({id:n.id,title:n.title,content:n.content,isPinned:n.is_pinned,createdAt:n.created_at,author:nicknames.get(n.created_by??"")??"운영진"}))}/></div>;
  }
  if(!isBoardKind(section))notFound();
  const page=/^[1-9]\d{0,4}$/.test(query.page??"")?Number(query.page):1;
  const data=await loadClanBoard(clanId,section,page);
  if(!data)throw new Error("게시글을 불러오지 못했습니다.");
  const pages=Math.max(1,Math.ceil(data.total/BOARD_PAGE_SIZE));
  return <div className="space-y-5"><ClanBoardPosts key={data.userId+section} base={base} gameSlug={gameSlug} clanId={clanId} kind={section} title={room.label} description={room.description} posts={data.posts}/>{pages>1&&<nav className="flex items-center justify-center gap-4 text-sm" aria-label="게시글 페이지">{page>1&&<Link href={base+"/board/"+section+"?page="+(page-1)}>이전</Link>}<span>{page} / {pages}</span>{page<pages&&<Link href={base+"/board/"+section+"?page="+(page+1)}>다음</Link>}</nav>}</div>;
}
