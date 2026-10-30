"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor, type EditorOptions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { Plugin } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { ImagePlus, Redo2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROMOTION_IMAGE_COUNT, PROMOTION_IMAGE_LIMIT, promotionImageUrl } from "@/lib/clan/promotion";
import { promotionDocument, readPromotionDocument, type PromotionDraftBlock, type PromotionDraftImage } from "@/lib/clan/promotion-document";
import styles from "./promotion-editor.module.css";

export { draftPromotionBlocks, type PromotionDraftBlock } from "@/lib/clan/promotion-document";

export function PromotionEditor({ gameSlug, clanId, blocks, onChange, disabled }: {
  gameSlug: string; clanId: string; blocks: PromotionDraftBlock[]; onChange: (value: PromotionDraftBlock[]) => void; disabled: boolean;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const insertion = useRef<{ from: number; to: number } | null>(null);
  const assets = useRef(new Map(blocks.flatMap(block => block.type === "image" ? [[block.key, block] as const] : [])));
  const previews = useRef(new Set<string>());
  const operations = useRef<{editor:Editor|null;insert:(files:File[])=>void}>({editor:null,insert:()=>{}});
  useEffect(() => { const urls = previews.current; return () => urls.forEach(url => URL.revokeObjectURL(url)); }, []);
  const source = useCallback((image: PromotionDraftImage) => image.preview ?? promotionImageUrl(gameSlug, clanId, image.path), [gameSlug, clanId]);
  const [content] = useState(() => promotionDocument(blocks, source));
  const [inlineImage] = useState(() => TiptapImage.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        assetKey: { default: null, parseHTML: element => element.getAttribute("data-promotion-key"), renderHTML: attrs => ({ "data-promotion-key": attrs.assetKey }) },
        src: { default: null, parseHTML: element => { const image = assets.current.get(element.getAttribute("data-promotion-key") ?? ""); return image ? source(image) : null; } },
      };
    },
    parseHTML() { return [{ tag: "img[data-promotion-key]", getAttrs: element => assets.current.has(element.getAttribute("data-promotion-key") ?? "") ? {} : false }]; },
    addInputRules() { return []; },
    addProseMirrorPlugins() {
      return [new Plugin({ filterTransaction: transaction => {
        if (!transaction.docChanged) return true;
        let images = 0; transaction.doc.descendants(node => { if (node.type.name === "image") images++; });
        if (images <= PROMOTION_IMAGE_COUNT) return true;
        toast.error("사진은 6장까지 넣을 수 있습니다."); return false;
      } })];
    },
  }).configure({ inline: true, HTMLAttributes: { draggable: "true" } }));
  const [extensions] = useState(() => [StarterKit.configure({ blockquote: false, bold: false, bulletList: false, code: false, codeBlock: false, heading: false, horizontalRule: false, italic: false, link: false, listItem: false, listKeymap: false, orderedList: false, strike: false, underline: false, trailingNode: false }), inlineImage]);
  // Reapplying view options on each keystroke can overwrite a browser selection change.
  const [editorProps] = useState<EditorOptions["editorProps"]>(() => ({
      attributes: { id: "promotion-content", role: "textbox", "aria-label": "내용", "aria-multiline": "true", "aria-describedby": "promotion-content-hint", class: styles.surface },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith("image/"));
        if (!files.length) return false;
        operations.current.insert(files); return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        const current = operations.current.editor;
        const position = current?.view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (position) current?.commands.setTextSelection(position.pos);
        operations.current.insert(files); return true;
      },
  }));
  const editor = useEditor({
    extensions, editorProps, content, immediatelyRender: false, shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: current }) => onChange(readPromotionDocument(current.getJSON(), assets.current)),
  });
  const selection = useEditorState({ editor, selector: ({ editor: current }) => ({ image: current?.isActive("image") ?? false, alt: String(current?.getAttributes("image").alt ?? ""), undo: current?.can().undo() ?? false, redo: current?.can().redo() ?? false }) });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  useEffect(() => {
    for (const block of blocks) if (block.type === "image") assets.current.set(block.key, block);
    if (!editor) return;
    const transaction = editor.state.tr;
    editor.state.doc.descendants((node, position) => {
      const image = node.type.name === "image" ? assets.current.get(node.attrs.assetKey) : null;
      if (image && node.attrs.src !== source(image)) transaction.setNodeMarkup(position, undefined, { ...node.attrs, src: source(image) });
    });
    if (transaction.docChanged) editor.view.dispatch(transaction.setMeta("addToHistory", false));
  }, [blocks, editor, source]);
  const photos = blocks.filter(block => block.type === "image").length;
  const length = blocks.flatMap(block => block.type === "text" ? [block.text] : []).join("\n\n").trim().length;
  const empty = photos === 0 && blocks.every(block => block.type === "text" && !block.text);
  useEffect(() => { operations.current = {editor,insert:insertPhotos}; });
  function choosePhoto() {
    if (!editor) return;
    insertion.current = {from:editor.state.selection.from,to:editor.state.selection.to};
    const selection = window.getSelection();
    if (selection?.anchorNode && selection.focusNode && editor.view.dom.contains(selection.anchorNode) && editor.view.dom.contains(selection.focusNode)) {
      const anchor=editor.view.posAtDOM(selection.anchorNode,selection.anchorOffset), head=editor.view.posAtDOM(selection.focusNode,selection.focusOffset);
      insertion.current={from:Math.min(anchor,head),to:Math.max(anchor,head)};
    }
    picker.current?.click();
  }
  function insertPhotos(files: File[], position?: {from:number;to:number} | null) {
    if (!editor || disabled || !files.length) return;
    if (photos + files.length > PROMOTION_IMAGE_COUNT) { toast.error("사진은 6장까지 넣을 수 있습니다."); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > PROMOTION_IMAGE_LIMIT)) { toast.error("JPEG·PNG·WebP 사진을 한 장당 5MB 이내로 선택해 주십시오."); return; }
    const images = files.map(file => {
      const preview = URL.createObjectURL(file); previews.current.add(preview);
      const image: PromotionDraftImage = { key: crypto.randomUUID(), type: "image", path: "", alt: "", file, preview };
      assets.current.set(image.key, image);
      return { type: "image", attrs: { assetKey: image.key, src: preview, alt: "" } };
    });
    const chain = editor.chain().focus();
    if (position) chain.setTextSelection(position);
    chain.command(({tr})=>{closeHistory(tr);return true;}).insertContent(images).run();
  }
  return <div className={styles.editor}>
    <div className={styles.toolbar}>
      <div><Button type="button" variant="ghost" size="sm" disabled={disabled || !editor || photos >= 6} onMouseDown={event => event.preventDefault()} onClick={choosePhoto}><ImagePlus size={16} aria-hidden />사진 넣기</Button><span className={styles.divider} /><Button type="button" size="icon" variant="ghost" aria-label="실행 취소" disabled={disabled || !selection?.undo} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={15} /></Button><Button type="button" size="icon" variant="ghost" aria-label="다시 실행" disabled={disabled || !selection?.redo} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={15} /></Button></div><span>{photos} / 6장</span>
    </div>
    <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="홍보 사진 선택" disabled={disabled} onChange={event => { insertPhotos(Array.from(event.target.files ?? []),insertion.current); insertion.current=null; event.target.value = ""; }} />
    {selection?.image && <div className={styles.imageTools}><input aria-label="사진 설명" placeholder="사진 설명 (선택)" maxLength={160} value={selection.alt} disabled={disabled} onChange={event => editor?.commands.updateAttributes("image", { alt: event.target.value })} /><Button type="button" size="sm" variant="ghost" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().command(({tr})=>{closeHistory(tr);return true;}).deleteSelection().run()}><Trash2 size={14} aria-hidden />선택한 사진 삭제</Button></div>}
    <div className={styles.canvas} data-empty={empty} data-ready={!!editor}><EditorContent editor={editor} />{empty && <span className={styles.placeholder}>클랜 소개와 함께하고 싶은 활동을 적어보세요.</span>}</div>
    <p id="promotion-content-hint" className={styles.hint} aria-live="polite"><span className={length > 8000 ? "text-destructive" : ""}>{length.toLocaleString()} / 8,000자</span><span>커서 위치에 사진을 넣을 수 있습니다.</span></p>
  </div>;
}
