import { forbidden } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { ClanBoardNavigation } from "@/components/main-clan/clan-board-navigation";
export default async function BoardLayout({params,children}:{params:Promise<{gameSlug:string;clanId:string}>;children:React.ReactNode}) {
  const {gameSlug,clanId}=await params;
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  return <div className="space-y-5"><header><h2 className="text-xl font-semibold">게시판</h2><p className="mt-1 text-sm text-muted-foreground">{ctx.clanName}의 소식과 함께한 기록</p></header><div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)]"><ClanBoardNavigation base={"/games/"+gameSlug+"/clan/"+clanId+"/board"}/><section className="min-w-0">{children}</section></div></div>;
}
