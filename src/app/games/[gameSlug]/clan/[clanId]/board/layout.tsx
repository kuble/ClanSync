import { forbidden } from "next/navigation";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { ClanBoardNavigation } from "@/components/main-clan/clan-board-navigation";
import { HelpText } from "@/components/main-clan/help-text";
export default async function BoardLayout({params,children}:{params:Promise<{gameSlug:string;clanId:string}>;children:React.ReactNode}) {
  const {gameSlug,clanId}=await params;
  const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  return <div className="space-y-5"><header><h2 className="text-xl font-semibold"><HelpText label="게시판" help={`${ctx.clanName}의 소식과 함께한 기록`} /></h2></header><div className="grid min-w-0 gap-5"><ClanBoardNavigation base={"/games/"+gameSlug+"/clan/"+clanId+"/board"}/><section className="min-w-0">{children}</section></div></div>;
}
