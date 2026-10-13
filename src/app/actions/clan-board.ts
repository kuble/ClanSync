"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadMainClanContext } from "@/lib/clan/load-main-clan-context";
import { BOARD_IMAGE_BUCKET, boardChannels, boardThumbnail, isBoardKind, uuidPattern, validateBoardInput, type BoardDetails } from "@/lib/clan/board";

type Result = { ok: true; id?: string; warning?: string } | { ok: false; error: string };
async function actor(gameSlug: string, clanId: string) {
  if (!uuidPattern.test(clanId)) return null;
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return null;
  const ctx = await loadMainClanContext(supabase,user.id,gameSlug,clanId);
  return ctx ? { supabase,user,ctx } : null;
}
function refresh(gameSlug: string, clanId: string) { revalidatePath("/games/" + gameSlug + "/clan/" + clanId + "/board", "layout"); }

export async function saveBoardPostAction(gameSlug: string, clanId: string, input: {
  id: string; kind: string; title: string; content: string; details: BoardDetails; imagePath: string | null; editing: boolean; coachId?:string|null;
}): Promise<Result> {
  if (!input || !uuidPattern.test(input.id) || !isBoardKind(input.kind) || typeof input.title !== "string" || typeof input.content !== "string" || !input.details || typeof input.details !== "object" || Array.isArray(input.details) || typeof input.editing !== "boolean")
    return { ok:false,error:"글 정보를 확인해 주세요." };
  const error = validateBoardInput(input.kind,input.title,input.content,input.details);
  if (error) return { ok:false,error };
  const ctx = await actor(gameSlug,clanId);
  if (!ctx) return { ok:false,error:"활성 클랜원만 글을 작성할 수 있습니다." };
  const old = input.editing ? await ctx.supabase.from("clan_board_posts").select("id,author_id,image_path,coach_id").eq("id",input.id).eq("clan_id",clanId).eq("kind",input.kind).maybeSingle() : null;
  if (input.editing && (old?.error || !old?.data || (old.data.author_id !== ctx.user.id && ctx.ctx.role === "member"))) return { ok:false,error:"이 글을 편집할 권한이 없습니다." };
  const coachId=input.kind==="feedback"?(input.coachId??old?.data?.coach_id??null):null;
  if(input.kind==="feedback"&&(!input.editing||coachId!==old?.data?.coach_id)){
    if(typeof coachId!=="string"||!uuidPattern.test(coachId))return {ok:false,error:"피드백을 받을 코칭 선생님을 선택해 주세요."};
    const coach=await ctx.supabase.from("clan_board_coaches").select("user_id").eq("clan_id",clanId).eq("user_id",coachId).eq("accepting",true).maybeSingle();
    if(coach.error||!coach.data||coachId===(old?.data?.author_id??ctx.user.id))return {ok:false,error:"신청을 받는 다른 코칭 선생님을 선택해 주세요."};
  }
  if (input.imagePath !== null) {
    if (typeof input.imagePath !== "string") return { ok:false,error:"사진 정보를 확인해 주세요." };
    if (input.imagePath !== old?.data?.image_path) {
      const owner = old?.data?.author_id ?? ctx.user.id;
      const prefix = clanId + "/" + owner + "/" + input.id + "/";
      if (!input.imagePath.startsWith(prefix) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(input.imagePath.slice(prefix.length))) return { ok:false,error:"이 글의 사진을 선택해 주세요." };
      if (owner !== ctx.user.id) return { ok:false,error:"작성자만 사진을 교체할 수 있습니다." };
      const slash = input.imagePath.lastIndexOf("/");
      const objects = await ctx.supabase.storage.from(BOARD_IMAGE_BUCKET).list(input.imagePath.slice(0,slash));
      if (objects.error || !objects.data.some(file => file.name === input.imagePath!.slice(slash+1))) return { ok:false,error:"사진 업로드를 완료한 뒤 저장해 주세요." };
    }
  }
  if (input.kind === "memories" && !input.imagePath) return { ok:false,error:"추억 사진을 한 장 선택해 주세요." };
  const details: BoardDetails = input.kind === "feedback" ? { role:input.details.role?.trim(), replay:input.details.replay?.trim().toUpperCase(), video:input.details.video?.trim(), moment:input.details.moment?.trim() }
    : input.kind === "channels" ? { channels:boardChannels(input.details).map(c=>({platform:c.platform,url:c.url.trim()})), schedule:input.details.schedule?.trim() }
    : input.kind === "memories" ? { takenAt:input.details.takenAt } : {};
  const values = { title:input.title.trim(),content:input.content.trim(),details:JSON.parse(JSON.stringify(details)),image_path:input.imagePath,coach_id:coachId };
  const query = input.editing ? ctx.supabase.from("clan_board_posts").update(values).eq("id",input.id).eq("clan_id",clanId).eq("kind",input.kind)
    : ctx.supabase.from("clan_board_posts").insert({ ...values,id:input.id,clan_id:clanId,kind:input.kind });
  const saved = await query.select("id").maybeSingle();
  if (saved.error || !saved.data) return { ok:false,error:"글을 저장하지 못했습니다. 입력한 내용은 유지됩니다." };
  let warning: string | undefined;
  if (old?.data?.image_path && old.data.image_path !== input.imagePath) {
    const cleaned = await ctx.supabase.storage.from(BOARD_IMAGE_BUCKET).remove([old.data.image_path,boardThumbnail(old.data.image_path)]);
    if (cleaned.error) warning = "글은 저장됐지만 이전 사진 파일 정리가 지연됐습니다.";
  }
  refresh(gameSlug,clanId);
  return { ok:true,id:saved.data.id,warning };
}

export async function deleteBoardPostAction(gameSlug: string, clanId: string, id: string): Promise<Result> {
  if (!uuidPattern.test(id)) return { ok:false,error:"글 정보를 확인해 주세요." };
  const ctx = await actor(gameSlug,clanId);
  if (!ctx) return { ok:false,error:"클랜 접근 권한을 확인해 주세요." };
  const deleted = await ctx.supabase.from("clan_board_posts").delete().eq("id",id).eq("clan_id",clanId).select("id,image_path").maybeSingle();
  if (deleted.error || !deleted.data) return { ok:false,error:"글을 삭제하지 못했습니다. 작성자 또는 운영진만 삭제할 수 있습니다." };
  let warning: string | undefined;
  if (deleted.data.image_path) {
    const cleaned = await ctx.supabase.storage.from(BOARD_IMAGE_BUCKET).remove([deleted.data.image_path,boardThumbnail(deleted.data.image_path)]);
    if (cleaned.error) warning = "글은 삭제됐지만 사진 파일 정리가 지연됐습니다.";
  }
  refresh(gameSlug,clanId);
  return { ok:true,warning };
}

export async function setBoardStatusAction(gameSlug: string, clanId: string, id: string, status: string): Promise<Result> {
  if (!uuidPattern.test(id) || !["requested","answering","complete"].includes(status)) return { ok:false,error:"신청 상태를 확인해 주세요." };
  const ctx = await actor(gameSlug,clanId);
  if (!ctx) return { ok:false,error:"클랜 접근 권한을 확인해 주세요." };
  const result = await ctx.supabase.from("clan_board_posts").update({status}).eq("id",id).eq("clan_id",clanId).eq("kind","feedback").select("id").maybeSingle();
  if (result.error || !result.data) return { ok:false,error:"신청자·담당 선생님·운영진만 상태를 바꿀 수 있습니다." };
  refresh(gameSlug,clanId); return { ok:true };
}

export async function saveBoardCommentAction(gameSlug: string, clanId: string, postId: string, content: string, commentId: string | null = null): Promise<Result> {
  if (!uuidPattern.test(postId) || (commentId !== null && !uuidPattern.test(commentId)) || typeof content !== "string" || !content.trim() || content.trim().length>1000) return { ok:false,error:"댓글은 1~1,000자로 입력해 주세요." };
  const ctx = await actor(gameSlug,clanId);
  if (!ctx) return { ok:false,error:"활성 클랜원만 댓글을 작성할 수 있습니다." };
  const post = await ctx.supabase.from("clan_board_posts").select("id").eq("id",postId).eq("clan_id",clanId).maybeSingle();
  if (post.error || !post.data) return { ok:false,error:"이 글에 접근할 수 없습니다." };
  const query = commentId ? ctx.supabase.from("clan_board_comments").update({content:content.trim()}).eq("id",commentId).eq("post_id",postId)
    : ctx.supabase.from("clan_board_comments").insert({post_id:postId,content:content.trim()});
  const saved = await query.select("id").maybeSingle();
  if (saved.error || !saved.data) return { ok:false,error:"댓글을 저장하지 못했습니다. 작성 내용은 유지됩니다." };
  refresh(gameSlug,clanId); return { ok:true };
}
export async function deleteBoardCommentAction(gameSlug: string, clanId: string, postId: string, id: string): Promise<Result> {
  if (!uuidPattern.test(id) || !uuidPattern.test(postId)) return {ok:false,error:"댓글 정보를 확인해 주세요."};
  const ctx = await actor(gameSlug,clanId);
  if (!ctx) return {ok:false,error:"클랜 접근 권한을 확인해 주세요."};
  const post = await ctx.supabase.from("clan_board_posts").select("id").eq("id",postId).eq("clan_id",clanId).maybeSingle();
  if (!post.data || post.error) return {ok:false,error:"이 글에 접근할 수 없습니다."};
  const result = await ctx.supabase.from("clan_board_comments").delete().eq("id",id).eq("post_id",postId).select("id").maybeSingle();
  if (!result.data || result.error) return {ok:false,error:"작성자 또는 운영진만 댓글을 삭제할 수 있습니다."};
  refresh(gameSlug,clanId); return {ok:true};
}
export async function setBoardReactionAction(gameSlug: string, clanId: string, postId: string, liked: boolean): Promise<Result> {
  if (!uuidPattern.test(postId) || typeof liked !== "boolean") return {ok:false,error:"공감 정보를 확인해 주세요."};
  const ctx = await actor(gameSlug,clanId);
  if (!ctx) return {ok:false,error:"활성 클랜원만 공감할 수 있습니다."};
  const post = await ctx.supabase.from("clan_board_posts").select("id").eq("id",postId).eq("clan_id",clanId).maybeSingle();
  if (!post.data || post.error) return {ok:false,error:"이 글에 접근할 수 없습니다."};
  const result = liked ? await ctx.supabase.from("clan_board_reactions").insert({post_id:postId}) : await ctx.supabase.from("clan_board_reactions").delete().eq("post_id",postId).eq("user_id",ctx.user.id);
  if (result.error && result.error.code !== "23505") return {ok:false,error:"공감을 저장하지 못했습니다."};
  refresh(gameSlug,clanId); return {ok:true};
}

export async function saveCoachProfileAction(gameSlug:string,clanId:string,input:{expertise:string;bio:string;accepting:boolean}):Promise<Result>{
  if(!input||typeof input.expertise!=="string"||!input.expertise.trim()||input.expertise.trim().length>100||typeof input.bio!=="string"||input.bio.length>1000||typeof input.accepting!=="boolean")return {ok:false,error:"코칭 분야와 소개를 확인해 주세요."};
  const ctx=await actor(gameSlug,clanId);
  if(!ctx)return {ok:false,error:"활성 클랜원만 코칭 선생님으로 등록할 수 있습니다."};
  const values={expertise:input.expertise.trim(),bio:input.bio.trim(),accepting:input.accepting};
  const old=await ctx.supabase.from("clan_board_coaches").select("user_id").eq("clan_id",clanId).eq("user_id",ctx.user.id).maybeSingle();
  if(old.error)return {ok:false,error:"선생님 프로필을 확인하지 못했습니다."};
  const result=old.data?await ctx.supabase.from("clan_board_coaches").update(values).eq("clan_id",clanId).eq("user_id",ctx.user.id):await ctx.supabase.from("clan_board_coaches").insert({...values,clan_id:clanId});
  if(result.error)return {ok:false,error:"선생님 프로필을 저장하지 못했습니다."};
  refresh(gameSlug,clanId);return {ok:true};
}
