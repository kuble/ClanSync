import sharp from "sharp";
import { CLAN_EMOJI_GIF_ENABLED, squareEmojiCrop, validEmojiCrop } from "./emoji-crop";
import { EMOJI_LIMIT } from "./cosmetics";

export async function processEmojiImage(bytes:Buffer,requestedCrop:unknown=null,allowAnimated:boolean=CLAN_EMOJI_GIF_ENABLED) {
  const meta=await sharp(bytes,{animated:true,limitInputPixels:4_194_304}).metadata();
  const pages=meta.pages??1;
  if(!meta.format||!["png","webp","jpeg","gif"].includes(meta.format)||((pages>1||meta.format==="gif")&&!allowAnimated))throw new Error("정적 PNG·WebP·JPG 이미지를 선택해 주십시오.");
  if(pages>50||!meta.width||!meta.height||meta.width*meta.height>4_194_304)throw new Error("이미지 크기가 너무 큽니다.");
  const frames:Buffer[]=[];
  for(let page=0;page<pages;page++) {
    const source=await sharp(bytes,{page,pages:1,limitInputPixels:4_194_304}).rotate().toBuffer({resolveWithObject:true});
    const {width,height}=source.info;
    const crop=requestedCrop??squareEmojiCrop(width,height);
    if(!validEmojiCrop(crop,width,height))throw new Error("이미지 자르기 영역을 확인해 주십시오.");
    frames.push(await sharp(source.data).extract({left:crop.x,top:crop.y,width:crop.size,height:crop.size}).resize(128,128).ensureAlpha().raw().toBuffer());
  }
  const output=await sharp(Buffer.concat(frames),{raw:{width:128,height:128*pages,channels:4,pageHeight:128}}).webp({quality:90,...(pages>1?{loop:meta.loop??0,delay:meta.delay??100}:{})}).toBuffer();
  if(output.byteLength>EMOJI_LIMIT)throw new Error("변환한 이미지가 256KB를 넘습니다. 더 작은 이미지를 선택해 주십시오.");
  return output;
}
