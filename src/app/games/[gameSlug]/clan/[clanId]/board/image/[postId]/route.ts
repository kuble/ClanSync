import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { BOARD_IMAGE_BUCKET,boardThumbnail,uuidPattern } from "@/lib/clan/board";
// Revocation and post deletion must be checked on every photo request.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET(request:Request,{params}:{params:Promise<{gameSlug:string;clanId:string;postId:string}>}){
  const {gameSlug,clanId,postId}=await params;
  if(!uuidPattern.test(postId)||!uuidPattern.test(clanId))return new Response(null,{status:404});
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user||!await loadMainClanContext(client,user.id,gameSlug,clanId))return new Response(null,{status:403,headers:{"Cache-Control":"private, no-store"}});
  const post=await client.from("clan_board_posts").select("image_path").eq("id",postId).eq("clan_id",clanId).maybeSingle();
  if(post.error||!post.data?.image_path)return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
  const thumbnail=new URL(request.url).searchParams.get("thumb")==="1";
  const result=await client.storage.from(BOARD_IMAGE_BUCKET).download(thumbnail?boardThumbnail(post.data.image_path):post.data.image_path);
  if(result.error||!result.data)return new Response(null,{status:404});
  return new Response(result.data,{headers:{"Content-Type":result.data.type||"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":"inline"}});
}
