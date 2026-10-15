import { forbidden } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { ClanBoardNavigation } from "@/components/main-clan/clan-board-navigation";
export default async function BoardLayout({params,children}:{params:Promise<{gameSlug:string;clanId:string}>;children:React.ReactNode}) {
  const {gameSlug,clanId}=await params;
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  return <div className="grid min-w-0 gap-5"><ClanBoardNavigation base={"/games/"+gameSlug+"/clan/"+clanId+"/board"}/><section className="min-w-0">{children}</section></div>;
}
