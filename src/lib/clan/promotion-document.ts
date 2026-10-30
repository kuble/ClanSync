import type { JSONContent } from "@tiptap/react";
import type { PromotionBlock } from "./promotion";

export type PromotionDraftBlock = { key: string; type: "text"; text: string } | { key: string; type: "image"; path: string; alt: string; file?: File; preview?: string };
export type PromotionDraftImage = Extract<PromotionDraftBlock, { type: "image" }>;
export function draftPromotionBlocks(blocks: PromotionBlock[]): PromotionDraftBlock[] {
  return blocks.map((block, index) => ({ ...block, key: `saved-${index}` }));
}

export function promotionDocument(blocks: PromotionDraftBlock[], imageSrc: (image: PromotionDraftImage) => string): JSONContent {
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }];
  for (const block of blocks) {
    if (block.type === "image") paragraphs[paragraphs.length - 1].content!.push({ type: "image", attrs: { assetKey: block.key, src: imageSrc(block), alt: block.alt } });
    else block.text.split("\n").forEach((text, index) => {
      if (index) paragraphs.push({ type: "paragraph", content: [] });
      if (text) paragraphs[paragraphs.length - 1].content!.push({ type: "text", text });
    });
  }
  return { type: "doc", content: paragraphs };
}

/** Only our uploaded assets and plain text leave the editor; HTML is never persisted. */
export function readPromotionDocument(doc: JSONContent, images: ReadonlyMap<string, PromotionDraftImage>): PromotionDraftBlock[] {
  const blocks: PromotionDraftBlock[] = [];
  let text = "";
  function flush() {
    if (text) { blocks.push({ key: `text-${blocks.length}`, type: "text", text }); text = ""; }
  }
  function read(node: JSONContent) {
    if (node.type === "text") text += node.text ?? "";
    else if (node.type === "hardBreak") text += "\n";
    else if (node.type === "image") {
      const image = images.get(node.attrs?.assetKey);
      if (image) { flush(); blocks.push({ ...image, alt: String(node.attrs?.alt ?? "").slice(0, 160) }); }
    } else node.content?.forEach(read);
  }
  doc.content?.forEach((paragraph, index) => { if (index) text += "\n"; read(paragraph); });
  flush();
  return blocks.length ? blocks : [{ key: "text-0", type: "text", text: "" }];
}
