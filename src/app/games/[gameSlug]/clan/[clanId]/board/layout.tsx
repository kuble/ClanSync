import { forbidden } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { ClanBoardNavigation } from "@/components/main-clan/clan-board-navigation";
export default async function BoardLayout({params,children}:{params:Promise<{gameSlug:string;clanId:string}>;children:React.ReactNode}) {
  const {gameSlug,clanId}=await params;
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  return <div className="grid min-w-0 gap-5"><ClanBoardNavigation base={"/games/"+gameSlug+"/clan/"+clanId+"/board"}/><section tabIndex={0} className="board-scroll h-[calc(100dvh-16rem)] min-h-80 min-w-0 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-ring" aria-label="게시판 내용">{children}</section></div>;
}
