import type { Database, Json } from "@/lib/supabase/database.types";
import type { CommentReaction } from "./comment-reactions";
import { readPhotoStickerPlacement, type PhotoStickerPlacement } from "./photo-sticker";

export const BOARD_SECTIONS = [
  { key: "notices", label: "클랜 공지 및 규칙", description: "함께 지킬 약속과 중요한 소식" },
  { key: "free", label: "자유 게시판", description: "클랜원과 나누는 일상과 게임 이야기" },
  { key: "feedback", label: "피드백 신청 게시판", description: "리플레이를 함께 보며 더 나은 플레이를 찾아요" },
  { key: "channels", label: "방송 채널 홍보방", description: "우리 클랜원의 방송을 만나보세요" },
  { key: "memories", label: "추억 열람방", description: "사진 한 장에 남기는 우리의 시간" },
] as const;
export type BoardSection = (typeof BOARD_SECTIONS)[number]["key"];
export type BoardKind = Exclude<BoardSection, "notices">;
export const BOARD_PAGE_SIZE = 24;
export const BOARD_IMAGE_BUCKET = "clan-board-images";
export const BOARD_IMAGE_LIMIT = 5 * 1024 * 1024;
export function boardDate(value: string, withTime = false) {
  const kst = new Date(Date.parse(value) + 9 * 60 * 60 * 1000).toISOString();
  return kst.slice(0,10).replaceAll("-", ". ") + "." + (withTime ? " " + kst.slice(11,16) : "");
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isBoardKind(value: unknown): value is BoardKind {
  return typeof value === "string" && BOARD_SECTIONS.some(s => s.key === value && s.key !== "notices");
}
export type BoardPost = Database["public"]["Tables"]["clan_board_posts"]["Row"] & {
  author: string; canManage: boolean; canReplaceImage: boolean; commentCount: number; coachName?: string; canSetStatus?: boolean; canSetChannelLive?: boolean;
};
export type BoardComment = Database["public"]["Tables"]["clan_board_comments"]["Row"] & { author: string; canManage: boolean; reactions: CommentReaction[]; emojiReactions?: {emoji_id:string;total:number;mine:boolean}[] };
export type BoardListPost=Pick<BoardPost,"id"|"title"|"content"|"details"|"status"|"image_path"|"created_at"|"author"|"commentCount"|"coachName">;
export const STREAM_PLATFORMS = ["YouTube","CHZZK","Twitch","SOOP"] as const;
export type BoardChannel = {platform:string;url:string};
export type BoardDetails = { role?: string; replay?: string; video?: string; moment?: string; platform?: string; channel?: string; channels?: BoardChannel[]; schedule?: string; takenAt?: string; isLive?: boolean; photoFrame?: string; photoSticker?: string; photoStickerPlacement?: PhotoStickerPlacement };
export const FEEDBACK_STATUS = { requested: "신청", answering: "답변 중", complete: "완료" } as const;
export function boardDetails(value: Json): BoardDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const details = Object.fromEntries(Object.entries(value).filter(([key, v]) => ["role","replay","video","moment","platform","channel","schedule","takenAt","photoFrame","photoSticker"].includes(key) && typeof v === "string")) as BoardDetails;
  if(Array.isArray(value.channels))details.channels=value.channels.filter((entry):entry is {platform:string;url:string}=>!!entry&&typeof entry==='object'&&!Array.isArray(entry)&&typeof entry.platform==='string'&&typeof entry.url==='string');
  if(typeof value.isLive==="boolean")details.isLive=value.isLive;
  const placement=readPhotoStickerPlacement(value.photoStickerPlacement);
  if(placement)details.photoStickerPlacement=placement;
  return details;
}
export function boardChannels(details:BoardDetails):BoardChannel[]{return details.channels??(details.platform&&details.channel?[{platform:details.platform,url:details.channel}]:[]);}
export function safeBoardUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function boardThumbnail(path: string) { return path.replace(/\.(jpg|png|webp)$/, ".thumb.webp"); }
export function boardImageUrl(base: string, postId: string, thumbnail = false) {
  return base + "/board/image/" + postId + (thumbnail ? "?thumb=1" : "");
}
export function validateBoardInput(kind: BoardKind, title: string, content: string, raw: BoardDetails) {
  if (!title.trim() || title.trim().length > 200) return "제목은 1~200자로 입력해 주세요.";
  if (content.trim().length > (kind === "memories" ? 100 : 20000)) return kind === "memories" ? "사진 아래 한마디는 100자 이내로 적어 주세요." : "본문은 20,000자 이내로 입력해 주세요.";
  if (kind === "free" && !content.trim()) return "본문을 입력해 주세요.";
  if (kind === "memories" && ((raw.photoFrame && !["classic","film","tape"].includes(raw.photoFrame)) || (raw.photoSticker && !["none","sparkle","heart","gg"].includes(raw.photoSticker)))) return "사진 꾸미기를 확인해 주세요.";
  if (raw.photoStickerPlacement !== undefined && (kind !== "memories" || !raw.photoSticker || raw.photoSticker === "none" || !readPhotoStickerPlacement(raw.photoStickerPlacement))) return "스티커 위치와 회전을 확인해 주세요.";
  if (Object.entries(raw).some(([key,v]) => key==="isLive" ? kind!=="channels"||typeof v!=="boolean" : !["channels","photoStickerPlacement"].includes(key)&&(typeof v !== "string" || v.length > 1000))) return "입력 내용을 확인해 주세요.";
  if (kind === "feedback") {
    if (!raw.role?.trim() || raw.role.length > 100 || !content.trim()) return "역할·영웅과 궁금한 점을 입력해 주세요.";
    if (raw.replay && !/^[a-z0-9]{6,12}$/i.test(raw.replay.trim())) return "리플레이 코드는 영문·숫자 6~12자로 입력해 주세요.";
    if (!raw.replay?.trim() && !raw.video?.trim()) return "리플레이 코드 또는 영상 링크를 입력해 주세요.";
    if (raw.video && !safeBoardUrl(raw.video)) return "영상은 https 링크를 입력해 주세요.";
    if ((raw.moment?.length ?? 0) > 100) return "궁금한 장면은 100자 이내로 적어 주세요.";
  }
  if (kind === "channels") {
    const hosts: Record<string,string[]> = { YouTube:["youtube.com","youtu.be"], CHZZK:["chzzk.naver.com"], Twitch:["twitch.tv"], SOOP:["sooplive.co.kr","afreecatv.com"] };
    const channels=boardChannels(raw);
    if(!Array.isArray(channels)||channels.length<1||channels.length>4)return "방송 채널을 1~4개 등록해 주세요.";
    const platforms=new Set<string>();
    for(const entry of channels){
      if(!entry||typeof entry.platform!=="string"||typeof entry.url!=="string"||entry.url.length>600)return "방송 채널 정보를 확인해 주세요.";
      const url=safeBoardUrl(entry.url),allowed=hosts[entry.platform];
      if(!url||!allowed?.some(h=>new URL(url).hostname===h||new URL(url).hostname.endsWith("."+h)))return "플랫폼에 맞는 방송 채널의 https 링크를 입력해 주세요.";
      if(platforms.has(entry.platform))return "같은 방송 플랫폼은 한 번만 등록해 주세요.";
      platforms.add(entry.platform);
    }
    if ((raw.schedule?.length ?? 0) > 100) return "방송 시간은 100자 이내로 적어 주세요.";
  }
  if (raw.takenAt && (!/^\d{4}-\d{2}-\d{2}$/.test(raw.takenAt) || !Number.isFinite(Date.parse(raw.takenAt)) || new Date(raw.takenAt).toISOString().slice(0,10) !== raw.takenAt)) return "촬영일을 확인해 주세요.";
  return null;
}
