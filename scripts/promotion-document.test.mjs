import { test } from "node:test";
import assert from "node:assert/strict";
import { promotionDocument, readPromotionDocument } from "../src/lib/clan/promotion-document.ts";

const image={key:"photo",type:"image",path:"owned/photo.webp",alt:"우리 클랜"};
const images=new Map([[image.key,image]]);
const text=value=>({key:"text",type:"text",text:value});
const src=()=>"/owned-image";
const content=blocks=>blocks.map(block=>block.type==="text"?block.text: "[사진]").join("");

test("a photo stays between characters in one paragraph and deletion rejoins the text",()=>{
  const doc=promotionDocument([text("앞글"),image,text("뒤글")],src);
  assert.equal(doc.content.length,1);
  assert.deepEqual(doc.content[0].content.map(node=>node.type),["text","image","text"]);
  assert.equal(content(readPromotionDocument(doc,images)),"앞글[사진]뒤글");
  doc.content[0].content.splice(1,1);
  assert.deepEqual(readPromotionDocument(doc,images),[{key:"text-0",type:"text",text:"앞글뒤글"}]);
});
test("old empty text fragments become one editor and explicit line breaks round-trip",()=>{
  assert.equal(promotionDocument([text(""),text("")],src).content.length,1);
  const original=[text("첫 줄\n\n"),image,text("\n마지막 줄")];
  assert.equal(content(readPromotionDocument(promotionDocument(original,src),images)),content(original));
});
test("only registered images are persisted and their file identity survives undo",()=>{
  const file=new Blob(["photo"]), asset={...image,file,preview:"blob:owned"};
  const known=new Map([[asset.key,asset]]);
  const doc=promotionDocument([text("시작"),asset,text("끝")],src);
  const result=readPromotionDocument(doc,known);
  assert.equal(result[1].file,file);
  doc.content[0].content[1].attrs.assetKey="external";
  assert.equal(content(readPromotionDocument(doc,known)),"시작끝");
  assert.deepEqual(readPromotionDocument({type:"doc",content:[{type:"paragraph"}]},known),[text("")].map(block=>({...block,key:"text-0"})));
});
