import { forbidden } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { ClanBoardNavigation } from "@/components/main-clan/clan-board-navigation";
export default async function BoardLayout({params,children}:{params:Promise<{gameSlug:string;clanId:string}>;children:React.ReactNode}) {
  const {gameSlug,clanId}=await params;
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  return <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-5"><ClanBoardNavigation base={"/games/"+gameSlug+"/clan/"+clanId+"/board"}/><section tabIndex={0} className="board-scroll relative min-h-0 min-w-0 overflow-y-auto overscroll-contain pb-3 focus-visible:outline-2 focus-visible:outline-ring" aria-label="게시판 내용">{children}</section></div>;
}
