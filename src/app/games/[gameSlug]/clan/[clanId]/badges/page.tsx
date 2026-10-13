import {forbidden} from "next/navigation";
import {getRequestMainClanContext} from "@/lib/clan/load-main-clan-context";
import {loadClanBadges} from "@/lib/clan/load-clan-badges";
import {ClanBadges} from "@/components/main-clan/clan-badges";
export default async function BadgePage({params}:{params:Promise<{gameSlug:string;clanId:string}>}){
  const {gameSlug,clanId}=await params;const ctx=await getRequestMainClanContext(gameSlug,clanId);
  if(!ctx)forbidden();
  const collection=await loadClanBadges(clanId);
  return <section className="space-y-5" aria-label="클랜 배지"><header><h2 className="text-xl font-semibold">클랜 배지 케이스</h2><p className="mt-1 text-sm text-muted-foreground">우리 클랜이 함께 모은 작은 기념들</p></header><ClanBadges key={collection.userId} collection={collection} gameSlug={gameSlug} clanId={clanId} canManage={ctx.role!=="member"}/></section>;
}
