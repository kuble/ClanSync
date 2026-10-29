import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root=fileURLToPath(new URL("../",import.meta.url));
const docs=path.join(root,"docs/design/namecard-backgrounds/normal-v1");
const catalog=JSON.parse(await readFile(path.join(docs,"manifest.json"),"utf8"));
function luminance(rgb){return rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
function color(value){return [1,3,5].map(start=>parseInt(value.slice(start,start+2),16));}
const textLuminance=[catalog.foreground,catalog.secondaryForeground].map(value=>luminance(color(value)));
const pictures=[],layers=[];
let minimum=Infinity;
for(const asset of catalog.assets){
  const svg=await readFile(path.join(root,`public/namecard-backgrounds/normal-v1/${asset.id}.svg`),"utf8");
  assert.match(svg,/viewBox="0 0 960 240"/);
  assert(!/<(?:script|image|animate|filter|linearGradient|radialGradient)\b|href=|url\(/i.test(svg));
  const colors=[...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]+)"/gi)].map(m=>m[1]);
  assert(colors.length&&colors.every(c=>[asset.base,asset.pattern].includes(c)));
  const output=path.join(root,`public/namecard-backgrounds/normal-v1/${asset.id}.webp`);
  await sharp(Buffer.from(svg)).resize(1280,320).webp({lossless:true}).toFile(output);
  for(const [width,height] of [[1280,320],[264,44],[240,80]]){
    const {data}=await sharp(output).resize(width,height,{fit:"cover"}).removeAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=0;i<data.length;i+=3){
      const background=luminance([data[i],data[i+1],data[i+2]]);
      for(const foreground of textLuminance){const contrast=(foreground+.05)/(background+.05);minimum=Math.min(minimum,contrast);assert(contrast>=4.5,`${asset.id}: unreadable foreground`);}
    }
  }
  pictures.push(output);
}

const width=1312,height=1324;
let canvas=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#111715"/><g font-family="Arial,sans-serif">`;
const label=(x,y,text,size=12,fill="#9BACa4",attrs="")=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${attrs}>${text}</text>`;
canvas+=label(48,48,"CLANSYNC / NAMECARD BACKGROUNDS",12,"#9BADA3",'letter-spacing="2"');
canvas+=label(48,101,"Room for your name.",34,"#F1F5F3",'font-weight="600"');
canvas+=label(48,136,"NORMAL 01–05 / TWO COLORS / STATIC / SEPARATE SYMBOL LAYER");
for(const [index,asset] of catalog.assets.entries()){
  const y=175+index*210;
  canvas+=label(48,y+16,`0${index+1} / ${asset.englishName}`,15,"#F1F5F3",'font-weight="600"');
  canvas+=label(48,y+39,`${asset.base} / ${asset.pattern}`,10);
  const add=async(input,w,h,left,top)=>layers.push({input:await sharp(input).resize(w,h,{fit:"cover"}).png().toBuffer(),left,top});
  await add(pictures[index],640,160,48,y+52);
  await add(pictures[index],320,80,736,y+52);
  await add(pictures[index],240,80,1024,y+144);
  await add(pictures[index],264,44,736,y+162);
  const symbol=path.join(root,`public/symbols/normal-v1/${asset.symbol}.svg`);
  for(const [x,top,size] of [[750,y+70,44],[1036,y+165,36],[744,y+168,32]])await add(symbol,size,size,x,top);
  let overlay=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g font-family="Arial,sans-serif">`;
  overlay+=label(808,y+86,"Player_01#1001",14,"#F1F5F3",'font-weight="600"');
  overlay+=label(808,y+108,"Clan member",11,"#C3D0CA");
  overlay+=label(1088,y+178,"Player_01",13,"#F1F5F3",'font-weight="600"');
  overlay+=label(1088,y+199,"Clan member",10,"#C3D0CA");
  overlay+=label(788,y+182,"Player_01",11,"#F1F5F3",'font-weight="600"');
  overlay+=label(788,y+197,"Clan member",9,"#C3D0CA");
  overlay+=label(1080,y+90,"4:1 / 320 × 80",11);
  overlay+="</g></svg>";
  layers.push({input:Buffer.from(overlay),left:0,top:0});
}
canvas+=label(48,1292,"SVG MASTERS / 1280 × 320 LOSSLESS WEBP / FULL-SURFACE TEXT CONTRAST ≥ 4.5:1",11);
canvas+="</g></svg>";
await sharp(Buffer.from(canvas)).composite(layers).png().toFile(path.join(docs,"contact-sheet.png"));
console.log(`Verified ${catalog.assets.length} backgrounds and 3 aspect ratios; minimum text contrast ${minimum.toFixed(2)}:1.`);
