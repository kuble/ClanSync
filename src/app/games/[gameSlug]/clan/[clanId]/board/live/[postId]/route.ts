import {getRequestClient} from "@/lib/supabase/request";
import {getRequestMainClanContext} from "@/lib/clan/load-main-clan-context";
import {boardChannels,boardDetails,uuidPattern} from "@/lib/clan/board";
import {loadChannelLive} from "@/lib/clan/load-channel-live";
export async function GET(_request:Request,{params}:{params:Promise<{gameSlug:string;clanId:string;postId:string}>}){
  const {gameSlug,clanId,postId}=await params;
  const headers={'Cache-Control':'private, no-store'};
  if(!uuidPattern.test(postId)||!uuidPattern.test(clanId))return Response.json({error:'Not found'},{status:404,headers});
  if(!await getRequestMainClanContext(gameSlug,clanId))return Response.json({error:'Forbidden'},{status:403,headers});
  const client=await getRequestClient();
  const post=await client.from('clan_board_posts').select('details').eq('id',postId).eq('clan_id',clanId).eq('kind','channels').maybeSingle();
  if(post.error)return Response.json({error:'Unavailable'},{status:503,headers});
  if(!post.data)return Response.json({error:'Not found'},{status:404,headers});
  const channels=boardChannels(boardDetails(post.data.details));
  if(!channels.length||channels.length>4)return Response.json({error:'Invalid channels'},{status:422,headers});
  return Response.json({channels,live:await loadChannelLive(channels)},{headers});
}
