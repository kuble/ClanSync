"use client";

import Image from "next/image";
import { createContext, useContext, useLayoutEffect, useRef, useState, type RefObject, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Search, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clanEmojiUrl, type ClanEmoji } from "@/lib/clan/cosmetics";
import { emojiToken, splitEmojiText } from "@/lib/clan/emoji-text";
import { cn } from "@/lib/utils";
import styles from "./clan-emoji-composer.module.css";

const EmojiContext = createContext<{ clanId: string; gameSlug: string; emojis: ClanEmoji[] }>({ clanId: "", gameSlug: "", emojis: [] });
export const useClanEmojis = () => useContext(EmojiContext);
export function ClanEmojiProvider({ children, ...value }: { children: ReactNode; clanId: string; gameSlug: string; emojis: ClanEmoji[] }) {
  return <EmojiContext.Provider value={value}>{children}</EmojiContext.Provider>;
}
export const BASIC_EMOJIS = [
  { value: "👍", emoji: "👍", label: "좋아요" }, { value: "❤️", emoji: "❤️", label: "하트" },
  { value: "😆", emoji: "😆", label: "웃음" }, { value: "👏", emoji: "👏", label: "박수" },
  { value: "🎉", emoji: "🎉", label: "축하" }, { value: "🔥", emoji: "🔥", label: "불꽃" },
  { value: "😊", emoji: "😊", label: "미소" }, { value: "🙏", emoji: "🙏", label: "감사" },
];
export function ClanEmojiPicker({ label = "이모티콘 선택", title = "이모티콘 선택", disabled = false, onSelect, onOpen, finalFocus, options = BASIC_EMOJIS, custom = true }: {
  label?: string; title?: string; disabled?: boolean; onSelect: (value: string, emoji?: ClanEmoji) => void;
  onOpen?: () => void; finalFocus?: RefObject<HTMLElement | null>; options?: readonly { value: string; emoji: string; label: string }[]; custom?: boolean;
}) {
  const { clanId, emojis } = useClanEmojis();
  const [open, setOpen] = useState(false), [query, setQuery] = useState("");
  const [tab, setTab] = useState<"custom" | "basic">("custom");
  const shared = custom && emojis.length > 0;
  const showCustom = shared && (tab === "custom" || !options.length);
  const choose = (value: string, emoji?: ClanEmoji) => { setOpen(false); onSelect(value, emoji); };
  return <Popover.Root open={open} onOpenChange={value => { if (value) { onOpen?.(); setQuery(""); } setOpen(value); }}>
    <Popover.Trigger render={<Button type="button" size="icon-sm" variant="ghost" disabled={disabled} />} aria-label={label} title={label}><SmilePlus className="size-4" aria-hidden /></Popover.Trigger>
    <Popover.Portal><Popover.Positioner side="top" align="start" sideOffset={8} className="z-[80]">
      <Popover.Popup finalFocus={finalFocus} className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl outline-none">
        <Popover.Title className="mb-3 text-xs font-semibold">{title}</Popover.Title>
        {shared && options.length > 0 && <div className="mb-3 flex gap-1 border-b pb-2" role="group" aria-label="이모티콘 분류">{(["custom", "basic"] as const).map(key => <button key={key} type="button" aria-pressed={tab === key} className={cn("rounded-md px-3 py-1.5 text-xs", tab === key ? "bg-primary/15 text-primary" : "text-muted-foreground")} onClick={() => setTab(key)}>{key === "custom" ? "클랜 공용" : "기본"}</button>)}</div>}
        <label className="mb-3 flex items-center gap-2 rounded-lg border px-2 py-1.5"><Search className="size-3.5 text-muted-foreground" aria-hidden /><input aria-label="이모티콘 검색" placeholder="이름 검색" className="min-w-0 w-full bg-transparent text-xs outline-none" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="board-scroll grid max-h-52 min-h-11 grid-cols-5 gap-1 overflow-y-auto" aria-label={showCustom ? "클랜 공용 이모티콘" : "기본 이모티콘"}>
          {showCustom ? emojis.filter(emoji => emoji.name.toLowerCase().includes(query.toLowerCase())).map(emoji => <button key={emoji.id} type="button" aria-label={`${emoji.name} 이모티콘`} title={emoji.name} className="grid size-11 place-items-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" onClick={() => choose(emojiToken(emoji.id), emoji)}><Image unoptimized src={clanEmojiUrl(clanId, emoji.id)} alt="" width={32} height={32} className="size-8 object-contain" /></button>)
          : options.filter(option => option.label.includes(query)).map(option => <button key={option.value} type="button" aria-label={`${option.label} ${title === "공감 선택" ? "공감" : "이모티콘"}`} title={option.label} className="grid size-11 place-items-center rounded-lg text-2xl hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" onClick={() => choose(option.value)}>{option.emoji}</button>)}
        </div>
        {!shared && !options.length && <p className="py-3 text-xs text-muted-foreground">등록된 공용 이모티콘이 없습니다.</p>}
      </Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}

export function ClanEmojiText({ text, className, large = true }: { text: string; className?: string; large?: boolean }) {
  const { clanId, emojis } = useClanEmojis();
  const parts = splitEmojiText(text, emojis);
  const only = large && parts.some(part => part.emoji) && parts.every(part => part.emoji || !part.text?.trim());
  return <span className={cn("whitespace-pre-wrap [overflow-wrap:anywhere]", className)}>{parts.map((part, index) => part.emoji
    ? <Image key={index} src={clanEmojiUrl(clanId, part.emoji.id)} alt={`:${part.emoji.name}:`} title={part.emoji.name} unoptimized width={only ? 48 : 24} height={only ? 48 : 24} className={cn("mx-0.5 inline-block shrink-0 object-contain align-middle", only ? "size-12" : "size-6")} />
    : <span key={index} className={part.missing ? "text-muted-foreground" : undefined}>{part.text}</span>)}</span>;
}

/** Serialize our image atoms as text, without accepting pasted HTML or arbitrary images. */
function readText(root: Node): string {
  if (root.nodeType === Node.TEXT_NODE) return root.textContent ?? "";
  if (!(root instanceof HTMLElement)) return "";
  if (root.dataset.emojiId) return emojiToken(root.dataset.emojiId);
  if (root.tagName === "BR") return "\n";
  let text="";
  Array.from(root.childNodes).forEach((child,index)=>{
    const block=child instanceof HTMLElement&&/^(DIV|P)$/.test(child.tagName);
    if(block&&text&&!text.endsWith("\n"))text+="\n";
    const content=readText(child);
    text+=block&&content==="\n"?"":content;
    if(block&&index<root.childNodes.length-1&&!text.endsWith("\n"))text+="\n";
  });
  return text;
}

export function ClanEmojiInput({ id, label, value, onChange, maxLength, disabled = false, placeholder, className, name, editorRef, pickerLabel, variant="comment", actions }: {
  id?: string; label: string; value: string; onChange: (value: string) => void; maxLength: number; disabled?: boolean;
  placeholder?: string; className?: string; name?: string; editorRef?: RefObject<HTMLDivElement | null>; pickerLabel?:string;
  variant?:"comment"|"post"; actions?:ReactNode;
}) {
  const context = useClanEmojis();
  const ownRef = useRef<HTMLDivElement>(null), input = editorRef ?? ownRef;
  const last = useRef<string | null>(null), selection = useRef<Range | null>(null);
  const [error, setError] = useState("");
  function fragment(text: string) {
    const result = document.createDocumentFragment();
    for (const part of splitEmojiText(text, context.emojis)) {
      if (!part.emoji) {
        if(part.token) { const missing=document.createElement("span");missing.contentEditable="false";missing.dataset.emojiId=part.token.slice(3,-1);missing.textContent=part.text??"";missing.className="text-muted-foreground";result.append(missing); }
        else result.append(document.createTextNode(part.text ?? ""));
        continue;
      }
      const atom = document.createElement("span"); atom.contentEditable = "false"; atom.dataset.emojiId = part.emoji.id;
      const image = document.createElement("img"); image.src = clanEmojiUrl(context.clanId, part.emoji.id); image.alt = `:${part.emoji.name}:`; image.title = part.emoji.name;
      image.width = 24; image.height = 24; image.className = "mx-0.5 inline-block size-6 object-contain align-middle"; image.draggable = false;
      atom.append(image); result.append(atom);
    }
    return result;
  }
  useLayoutEffect(() => {
    if (input.current && last.current !== value) { input.current.replaceChildren(fragment(value)); last.current = value; }
  });
  const remember = () => { const current = window.getSelection(); if (current?.rangeCount && input.current?.contains(current.anchorNode)) selection.current = current.getRangeAt(0).cloneRange(); };
  function commit() {
    if (!input.current || disabled) return;
    const next = readText(input.current);
    if (next.length > maxLength) { input.current.replaceChildren(fragment(value)); setError(`최대 ${maxLength.toLocaleString("ko-KR")}자까지 입력할 수 있습니다.`); return; }
    last.current = next; setError(""); onChange(next); remember();
  }
  function insert(text: string) {
    const root = input.current; if (!root || disabled) return;
    root.focus(); const current = window.getSelection();
    const range = selection.current && root.contains(selection.current.commonAncestorContainer) ? selection.current : document.createRange();
    if (!selection.current || !root.contains(range.commonAncestorContainer)) { range.selectNodeContents(root); range.collapse(false); }
    const addition = fragment(text), end = addition.lastChild;
    range.deleteContents(); range.insertNode(addition);
    if (end) { range.setStartAfter(end); range.collapse(true); current?.removeAllRanges(); current?.addRange(range); }
    commit();
  }
  return <div className={cn(styles.composer,variant==="post"&&styles.post)}>
    {name && <input type="hidden" name={name} value={value} />}
    <div id={id} ref={input} role="textbox" aria-label={label} aria-multiline="true" aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning
      data-placeholder={placeholder} data-empty={!value || undefined} className={cn("board-scroll",styles.editor,className)}
      onInput={commit} onBlur={remember} onKeyUp={remember} onMouseUp={remember} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!disabled){event.preventDefault();event.currentTarget.closest("form")?.requestSubmit();}}}
      onPaste={event => { event.preventDefault(); remember(); insert(event.clipboardData.getData("text/plain")); }} onDrop={event => event.preventDefault()}
      onCopy={event => { const current = window.getSelection(); if (!current?.rangeCount) return; const wrapper = document.createElement("div"); wrapper.append(current.getRangeAt(0).cloneContents()); event.clipboardData.setData("text/plain", readText(wrapper)); event.preventDefault(); }} />
    <div className={styles.toolbar}><ClanEmojiPicker label={pickerLabel??`${label} 이모티콘 선택`} disabled={disabled} onOpen={remember} finalFocus={input} onSelect={insert} /><span className={styles.counter}>{value.length} / {maxLength.toLocaleString("ko-KR")}</span>{actions?<div className={styles.actions}>{actions}</div>:<span className={styles.hint}>Ctrl + Enter</span>}</div>
    {error && <p role="alert" className="px-3 pb-2 text-xs text-destructive">{error}</p>}
  </div>;
}
