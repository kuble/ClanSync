"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Package, Plus, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveShowcaseAction } from "@/app/actions/profile-showcase";
import { BACKGROUNDS, TEMPLATES, QA_CABINET_LIMIT, itemPosition, placementRail, shelfGeometry, usedQuantity, type ShowcaseCabinet, type ShowcaseItem, type ShowcaseResult, type ShowcaseProduct } from "@/lib/showcase/domain";
import { ShowcaseArt } from "./showcase-art";
import { showcaseArtRatio, showcaseDisplayWidth } from "@/lib/showcase/art";
import styles from "./showcase.module.css";

function contains(bounds: DOMRect | undefined, x: number, y: number) {
  return !!bounds && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

function dropPosition(bounds: DOMRect | undefined, cabinet: ShowcaseCabinet, product: ShowcaseProduct, clientX: number, clientY: number) {
  if (!bounds || !contains(bounds, clientX, clientY)) return null;
  const y = (clientY - bounds.top) / bounds.height * 100;
  return [0, 1, 2].map(shelf => {
    const rail = placementRail(cabinet.template, shelf, product.kind);
    const width = Math.min(showcaseDisplayWidth(product), rail.width);
    const x = rail.width === width ? 50 : Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width * 100 - rail.left - width / 2) / (rail.width - width) * 100));
    const position = itemPosition(cabinet, { id: "preview", catalogId: product.id, shelf, x, layer: 0 }, product);
    return { shelf, x: Math.round(x), distance: Math.abs(position.top - y) };
  }).reduce((best, candidate) => candidate.distance < best.distance ? candidate : best);
}

function ShowcaseScene({ cabinet, catalog, selected, select, move, sceneRef, preview, storeAt, onDrag }: {
  cabinet: ShowcaseCabinet; catalog: ShowcaseProduct[]; selected?: string | null;
  select?: (id: string) => void; move?: (id: string, x: number, shelf: number) => void;
  sceneRef?: RefObject<HTMLDivElement | null>; preview?: ShowcaseItem | null;
  storeAt?: (id: string, x: number, y: number) => boolean;
  onDrag?: (point: { x: number; y: number; product: ShowcaseProduct } | null) => void;
}) {
  const localScene = useRef<HTMLDivElement>(null);
  const scene = sceneRef ?? localScene;
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ id: string; x: number; shelf: number } | null>(null);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") { drag.current = null; setDragPosition(null); onDrag?.(null); } };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [onDrag]);
  function pointerPosition(clientX: number, clientY: number, id: string) {
    const item = cabinet.items.find(i => i.id === id);
    const product = catalog.find(p => p.id === item?.catalogId);
    const position = product && dropPosition(scene.current?.getBoundingClientRect(), cabinet, product, clientX, clientY);
    return position ? { id, x: position.x, shelf: position.shelf } : null;
  }
  const items = preview ? [...cabinet.items, preview] : cabinet.items;
  return <div ref={scene} className={`${styles.scene} ${styles[cabinet.background]} ${cabinet.template === "focus" ? styles.focus : ""}`} data-testid="showcase-scene" aria-label="취향 전시">
    <div className={styles.backboard} aria-hidden="true" />
    <div className={styles.ambient} aria-hidden="true" />
    {items.map(original => {
      const product = catalog.find(p => p.id === original.catalogId);
      if (product?.kind !== "light") return null;
      const item = dragPosition?.id === original.id ? { ...original, ...dragPosition } : original;
      const position = itemPosition(cabinet, item, product);
      const top = position.top + position.width / showcaseArtRatio(product.sprite, product.image_path) * 1.3 * .83;
      return <div key={item.id} aria-hidden="true" data-testid="showcase-light-beam" className={styles.lightBeam} style={{ left: `${position.left}%`, top: `${top}%`, width: `${position.width * 5}%`, height: `${Math.max(5, shelfGeometry(cabinet.template, item.shelf).top - top + 2)}%` }} />;
    })}
    {[0, 1, 2].map(index => { const shelf = shelfGeometry(cabinet.template, index); return <div key={index} className={styles.shelf} data-shelf={index} style={{ left: `${shelf.left}%`, width: `${shelf.width}%`, top: `${shelf.top}%` }} aria-hidden="true"><svg viewBox="10 148 1180 134" preserveAspectRatio="none"><image href="/images/showcase/shelf-v2.webp" width="1200" height="400" /></svg></div>; })}
    {items.map(original => {
      const product = catalog.find(p => p.id === original.catalogId);
      if (!product) return null;
      const item = dragPosition?.id === original.id ? { ...original, ...dragPosition } : original;
      const position = itemPosition(cabinet, item, product);
      const visual = <><ShowcaseArt sprite={product.sprite} imagePath={product.image_path} />{product.kind === "label" && <span className={styles.labelText}>{item.text || "나의 취향"}</span>}</>;
      const className = `${styles.item} ${styles[product.kind]} ${selected === item.id ? styles.selected : ""} ${item.id === "preview" ? styles.dropPreview : ""}`;
      const style = { left: `${position.left}%`, top: `${position.top}%`, width: `${position.width}%`, aspectRatio: showcaseArtRatio(product.sprite, product.image_path), zIndex: (product.kind === "goods" ? 10 : 30) + item.shelf * 10 + item.layer };
      return select && item.id !== "preview" ? <button key={item.id} type="button" className={className} style={style} aria-label={`${product.name} 선택`} aria-pressed={selected === item.id}
        onClick={() => select(item.id)}
        onPointerDown={event => { if (!move || (event.pointerType === "mouse" && event.button !== 0)) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: item.id, startX: event.clientX, startY: event.clientY, moved: false }; }}
        onPointerMove={event => { if (!drag.current || !move) return; if (Math.hypot(event.clientX-drag.current.startX,event.clientY-drag.current.startY)>6) drag.current.moved = true; if (drag.current.moved) { setDragPosition(pointerPosition(event.clientX,event.clientY,item.id)); onDrag?.({x:event.clientX,y:event.clientY,product}); } }}
        onPointerUp={event => { if (drag.current?.moved && !storeAt?.(item.id,event.clientX,event.clientY)) { const pos = pointerPosition(event.clientX,event.clientY,item.id); if(pos) move?.(pos.id,pos.x,pos.shelf); } drag.current=null; setDragPosition(null); onDrag?.(null); }}
        onPointerCancel={() => { drag.current=null; setDragPosition(null); onDrag?.(null); }}
        onKeyDown={event => { if (!move) return; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(item.id,Math.max(0,Math.min(100,item.x+(event.key === "ArrowLeft" ? -2 : 2))),item.shelf); } }}>
        {visual}
      </button> : <div key={item.id} className={className} style={style} role="img" aria-label={`${product.name}${item.text ? ` · ${item.text}` : ""}`}>{visual}</div>;
    })}
    {!items.length && <p className={styles.emptyScene}>좋아하는 것부터 하나씩.</p>}
  </div>;
}

export function ProfileShowcase({ initial, userId, readOnly = false }: { initial: ShowcaseResult; userId: string; readOnly?: boolean }) {
  const router = useRouter();
  if (!initial.ok) return <section className={styles.unavailable}><p role="alert">{initial.error}</p><Button onClick={() => router.refresh()}>다시 불러오기</Button></section>;
  return <ShowcaseEditor key={userId} initial={initial.state} userId={userId} readOnly={readOnly} />;
}

function ShowcaseEditor({ initial, userId, readOnly }: { initial: Extract<ShowcaseResult,{ok:true}>["state"]; userId: string; readOnly: boolean }) {
  const [document, setDocument] = useState(initial.document);
  const [saved, setSaved] = useState(initial.document);
  const [revision, setRevision] = useState(initial.revision);
  const [current, setCurrent] = useState(initial.document.representative);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const [template, setTemplate] = useState<ShowcaseCabinet["template"] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editing) sceneRef.current?.scrollIntoView({block:"start"}); }, [editing]);
  const drawerRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const inventoryDrag = useRef<{ product: ShowcaseProduct; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number; product: ShowcaseProduct; overDrawer: boolean; outsideScene: boolean; fromInventory: boolean } | null>(null);
  const trackDrag = useCallback((point: {x:number;y:number;product:ShowcaseProduct} | null, fromInventory=false) => {
    setDragPoint(point ? {...point,fromInventory,overDrawer:contains(drawerRef.current?.getBoundingClientRect(),point.x,point.y),outsideScene:!contains(sceneRef.current?.getBoundingClientRect(),point.x,point.y)} : null);
  }, []);
  const [preview, setPreview] = useState<ShowcaseItem | null>(null);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") { if (inventoryDrag.current?.moved) suppressClick.current=true; inventoryDrag.current=null; setDragPoint(null); setPreview(null); } };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);
  const alive = useRef(true);
  useEffect(() => { alive.current=true; return () => { alive.current=false; }; }, []);
  const dirty = JSON.stringify(document) !== JSON.stringify(saved);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { if (alive.current) event.preventDefault(); }; window.addEventListener("beforeunload",warn); return () => window.removeEventListener("beforeunload",warn); }, [dirty]);
  const cabinet = document.cabinets.find(c => c.id === current) ?? document.cabinets[0];
  const selectedItem = cabinet.items.find(item => item.id === selected);
  const selectedProduct = initial.catalog.find(p => p.id === selectedItem?.catalogId);
  function updateCabinet(change: Partial<ShowcaseCabinet>) { setDocument(d => ({ ...d, cabinets: d.cabinets.map(c => c.id === cabinet.id ? { ...c,...change } : c) })); setNotice(""); }
  function updateItem(id: string, change: Partial<ShowcaseItem>) { updateCabinet({items: cabinet.items.map(item => item.id === id ? {...item,...change} : item)}); }
  function save() {
    if (pending) return;
    start(async () => { setError(""); const snapshot = document;
      try {
      const result = await saveShowcaseAction(snapshot,revision,userId);
      if (!alive.current) return;
      if (!result.ok) { setError(result.error); return; }
      setRevision(result.revision); setSaved(snapshot); setEditing(false); setSelected(null); setNotice("진열장을 저장했습니다.");
      } catch { if (alive.current) setError("연결이 끊어져 저장하지 못했습니다. 변경 내용은 유지됩니다."); }
    });
  }
  function addCabinet(copy = false) {
    if (document.cabinets.length >= QA_CABINET_LIMIT) return;
    const id = crypto.randomUUID();
    const next: ShowcaseCabinet = { id, name: copy ? `${cabinet.name.slice(0,25)} 복사` : "새 진열장", template: cabinet.template, background: cabinet.background, items: [] };
    // Copy only owned spare units; placements in other cabinets remain intact.
    if (copy) { const remaining = { ...initial.owned }; for (const c of document.cabinets) for (const item of c.items) remaining[item.catalogId] = (remaining[item.catalogId] ?? 0)-1;
      for (const item of cabinet.items) if ((remaining[item.catalogId] ?? 0)>0) { next.items.push({...item,id:crypto.randomUUID()}); remaining[item.catalogId]--; }
    }
    setDocument(d => ({ ...d,cabinets:[...d.cabinets,next] })); setCurrent(id); setSelected(null); setEditing(true);
    setNotice(copy ? "여분이 있는 굿즈만 복사했습니다. 기존 전시는 그대로 유지됩니다." : "");
  }
  function add(product: ShowcaseProduct, position?: {shelf: number; x: number}) {
    if (product.kind === "template" || (initial.owned[product.id] ?? 0) <= usedQuantity(document,product.id) || cabinet.items.length >= 60) return;
    const id = crypto.randomUUID(); updateCabinet({items:[...cabinet.items,{id,catalogId:product.id,shelf:position?.shelf ?? selectedItem?.shelf ?? 1,x:position?.x ?? 50,layer:Math.min(8,cabinet.items.length)}]}); setSelected(id);
  }
  function storeItem(id: string) { updateCabinet({items:cabinet.items.filter(i=>i.id!==id)}); setSelected(null); }
  const draggingOverDrawer = dragPoint?.overDrawer;
  return <section className={`${styles.container} ${editing ? styles.editing : ""} ${dragPoint ? styles.dragging : ""}`} aria-label="취향 진열장">
    <header className={styles.heading}><div><p>좋아하는 것들이 모이는 곳</p><h2>취향 진열장{document.representative === cabinet.id && <Star size={14} aria-label="대표 진열장" />}</h2></div>
      {!readOnly && <Button size="sm" variant={editing ? "default" : "outline"} disabled={pending} onClick={() => editing ? save() : setEditing(true)}>{pending ? "저장 중…" : editing ? "저장하고 닫기" : "꾸미기"}</Button>}
    </header>
    <ShowcaseScene cabinet={cabinet} catalog={initial.catalog} sceneRef={sceneRef} preview={preview} onDrag={trackDrag} storeAt={(id,x,y)=>{if(contains(drawerRef.current?.getBoundingClientRect(),x,y)){storeItem(id);setNotice("보관함에 넣었습니다.");return true;}return false;}} selected={editing ? selected : null} select={editing && !pending ? setSelected : undefined} move={editing && !pending ? (id,x,shelf) => updateItem(id,{x,shelf}) : undefined} />
    <nav className={styles.navigation} aria-label="저장한 진열장">
      <Button size="icon-sm" variant="ghost" aria-label="이전 진열장" disabled={pending || document.cabinets.length<2} onClick={() => { const index = document.cabinets.indexOf(cabinet); setCurrent(document.cabinets[(index+document.cabinets.length-1)%document.cabinets.length].id); setSelected(null); }}><ChevronLeft size={16} /></Button>
      <select aria-label="진열장 선택" disabled={pending} value={cabinet.id} onChange={event => {setCurrent(event.target.value);setSelected(null);}}>{document.cabinets.map((c,index) => <option key={c.id} value={c.id}>진열장 {index+1}{c.id===document.representative ? " · 대표" : ""}</option>)}</select>
      <span>{document.cabinets.indexOf(cabinet)+1} / {document.cabinets.length}</span>
      <Button size="icon-sm" variant="ghost" aria-label="다음 진열장" disabled={pending || document.cabinets.length<2} onClick={() => {setCurrent(document.cabinets[(document.cabinets.indexOf(cabinet)+1)%document.cabinets.length].id);setSelected(null);}}><ChevronRight size={16} /></Button>
    </nav>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {error && <div role="alert" className={styles.error}>{error}<Button size="sm" variant="outline" disabled={pending} onClick={save}>다시 저장</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setDiscarding(true)}>최신 내용 불러오기</Button></div>}
    {editing && !readOnly && <fieldset disabled={pending} className={styles.editor}>
      <div className={styles.settings}>
        <label>선반 모양<select aria-label="선반 모양" value={cabinet.template} onChange={e => setTemplate(e.target.value as ShowcaseCabinet["template"])}>{TEMPLATES.map(t => <option key={t.id} value={t.id} disabled={!!t.productId && !(initial.owned[t.productId]>0)}>{t.name} · {t.productId ? initial.owned[t.productId]>0 ? "보유 중" : "상점에서 받기" : "기본 제공"}</option>)}</select></label>
        <label>배경<select aria-label="진열장 배경" value={cabinet.background} onChange={e => updateCabinet({background:e.target.value as ShowcaseCabinet["background"]})}>{BACKGROUNDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <div className={styles.actions}><Button size="sm" variant="outline" disabled={document.cabinets.length>=QA_CABINET_LIMIT} onClick={() => addCabinet()}><Plus size={14} />새 진열장</Button><Button size="sm" variant="ghost" disabled={document.cabinets.length>=QA_CABINET_LIMIT} onClick={() => addCabinet(true)}>구성 복사</Button><Button size="sm" variant="ghost" onClick={() => setDocument(d => ({...d,representative:cabinet.id}))}><Star size={14} />대표로 설정</Button><Button size="sm" variant="ghost" disabled={document.cabinets.length<2} onClick={() => setDeleting(true)}>진열장 삭제</Button></div>
      <div ref={drawerRef} className={`${styles.drawer} ${draggingOverDrawer ? styles.drawerTarget : ""}`} data-testid="showcase-drawer" aria-label="굿즈 보관함">
        <div className={styles.inventoryHeading}><button type="button" className={styles.drawerToggle} aria-expanded={drawerOpen} aria-controls="showcase-inventory" onClick={()=>setDrawerOpen(!drawerOpen)}><Package size={16}/><strong>보관함</strong><ChevronDown size={16} style={{transform:drawerOpen?undefined:"rotate(180deg)"}}/><span>{drawerOpen?"접기":"열기"}</span></button><Link href="/store#showcase" onClick={e => {if(dirty){e.preventDefault();setError("상점으로 이동하기 전에 진열장을 저장해 주세요.");}}}><ShoppingBag size={14} />선반·굿즈 상점</Link></div>
        <div className={styles.drawerTools}><p className={styles.drawerHint} role="status">{dragPoint && !dragPoint.fromInventory ? "이곳에 놓으면 보관함으로 돌아와요" : "끌어서 선반에 놓기 · 누르면 바로 꺼내기"}</p>{drawerOpen && <div><button type="button" aria-label="이전 굿즈" onClick={()=>inventoryRef.current?.scrollBy({left:-280,behavior:"smooth"})}><ChevronLeft size={16}/></button><button type="button" aria-label="다음 굿즈" onClick={()=>inventoryRef.current?.scrollBy({left:280,behavior:"smooth"})}><ChevronRight size={16}/></button></div>}</div>
        <div ref={inventoryRef} id="showcase-inventory" className={styles.inventory} hidden={!drawerOpen}>{initial.catalog.filter(p => p.kind!=="template" && (initial.owned[p.id]??0)>0).map(p => {const spare=(initial.owned[p.id]??0)-usedQuantity(document,p.id);return <button key={p.id} type="button" aria-label={`${p.name} 꺼내기`} disabled={spare<=0 || cabinet.items.length>=60}
          onClick={event => {if(suppressClick.current && event.detail!==0){suppressClick.current=false;return;} add(p);}}
          onPointerDown={event=>{if(event.pointerType==="mouse" && event.button!==0)return; suppressClick.current=false; inventoryDrag.current={product:p,x:event.clientX,y:event.clientY,moved:false};event.currentTarget.setPointerCapture(event.pointerId);}}
          onPointerMove={event=>{const drag=inventoryDrag.current;if(!drag)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6)drag.moved=true;if(!drag.moved)return;trackDrag({x:event.clientX,y:event.clientY,product:p},true);const pos=dropPosition(sceneRef.current?.getBoundingClientRect(),cabinet,p,event.clientX,event.clientY);setPreview(pos?{id:"preview",catalogId:p.id,shelf:pos.shelf,x:pos.x,layer:8}:null);}}
          onPointerUp={event=>{if(inventoryDrag.current?.moved){suppressClick.current=true;const pos=dropPosition(sceneRef.current?.getBoundingClientRect(),cabinet,p,event.clientX,event.clientY);if(pos)add(p,pos);}inventoryDrag.current=null;setDragPoint(null);setPreview(null);}}
          onPointerCancel={()=>{suppressClick.current=true;inventoryDrag.current=null;setDragPoint(null);setPreview(null);}}
        ><ShowcaseArt sprite={p.sprite} imagePath={p.image_path}/><strong>{p.name}</strong><small>{spare>0 ? `남은 ${spare}개` : "모두 전시 중"}</small></button>;})}</div>
        {drawerOpen && <p className={styles.drawerFootnote}>보유한 수량만큼 전체 진열장에 배치할 수 있어요. 선반 모양은 위에서 바꿀 수 있습니다.</p>}
      </div>
      <h3 className={styles.listHeading}>이 진열장에 놓인 물건</h3>
      <div className={styles.placedList}>{cabinet.items.map(item => <button type="button" key={item.id} aria-pressed={selected===item.id} onClick={() => setSelected(item.id)}>{initial.catalog.find(p=>p.id===item.catalogId)?.name} <small>{item.shelf+1}단</small></button>)}</div>
      {selectedItem && selectedProduct && <div className={styles.controls} aria-label="선택한 굿즈 조절"><strong>{selectedProduct.name}</strong>
        <label>{selectedProduct.kind === "light" ? "설치 위치" : "선반"}<select aria-label={selectedProduct.kind === "light" ? "조명 설치 위치" : "굿즈 선반"} value={selectedItem.shelf} onChange={e=>updateItem(selectedItem.id,{shelf:Number(e.target.value)})}>{[0,1,2].map(s=><option key={s} value={s}>{selectedProduct.kind === "light" ? s === 0 ? "상단 프레임 · 1단 비추기" : `${s}단 아래 · ${s+1}단 비추기` : `${s+1}단`}</option>)}</select></label>
        <label>좌우 위치<input aria-label="굿즈 좌우 위치" type="range" min={0} max={100} value={selectedItem.x} onChange={e=>updateItem(selectedItem.id,{x:Number(e.target.value)})}/></label>
        <label>겹침 순서<select aria-label="굿즈 겹침 순서" value={selectedItem.layer} onChange={e=>updateItem(selectedItem.id,{layer:Number(e.target.value)})}>{Array.from({length:9},(_,i)=><option key={i} value={i}>{i===0 ? "맨 뒤" : i===8 ? "맨 앞" : `${i+1}번째`}</option>)}</select></label>
        {selectedProduct.kind==="label" && <label>주제 문구<input aria-label="명패 문구" maxLength={20} value={selectedItem.text??""} onChange={e=>updateItem(selectedItem.id,{text:e.target.value})}/></label>}
        <Button size="sm" variant="outline" onClick={()=>storeItem(selectedItem.id)}>보관함에 넣기</Button>
      </div>}
      <div className={styles.bottom}><span>{dirty ? "저장하지 않은 변경이 있습니다." : "저장된 구성입니다."}</span><Button size="sm" variant="ghost" onClick={()=>{setDocument(saved);setCurrent(saved.representative);setEditing(false);setSelected(null);setError("");}}>편집 취소</Button><Button size="sm" onClick={save}><Check size={14}/>저장하고 닫기</Button></div>
    </fieldset>}
    {dragPoint?.outsideScene && <div className={styles.dragGhost} style={{left:dragPoint.x,top:dragPoint.y}} aria-hidden="true"><ShowcaseArt sprite={dragPoint.product.sprite} imagePath={dragPoint.product.image_path}/></div>}
    {!readOnly && !editing && <div className={styles.footer}><Link href="/store#showcase">새로운 굿즈 둘러보기</Link><Link href="/profile/miniroom">기존 미니룸 보관함</Link></div>}
    <Dialog open={!!template} onOpenChange={open=>{if(!open)setTemplate(null);}}><DialogContent><DialogHeader><DialogTitle>선반 모양 바꾸기</DialogTitle><DialogDescription>같은 굿즈를 새 선반에 배치한 모습입니다. 확인하면 현재 진열장에 적용됩니다.</DialogDescription></DialogHeader>{template && <ShowcaseScene cabinet={{...cabinet,template}} catalog={initial.catalog}/>}<DialogFooter><Button variant="outline" onClick={()=>setTemplate(null)}>취소</Button><Button onClick={()=>{if(template)updateCabinet({template});setTemplate(null);}}>이 모양 적용</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={deleting} onOpenChange={setDeleting}><DialogContent><DialogHeader><DialogTitle>이 진열장을 삭제할까요?</DialogTitle><DialogDescription>놓아둔 굿즈는 모두 보관함으로 돌아갑니다. 대표 진열장을 삭제하면 첫 번째 진열장이 대표가 됩니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setDeleting(false)}>취소</Button><Button variant="destructive" onClick={()=>{const cabinets=document.cabinets.filter(c=>c.id!==cabinet.id);setDocument({...document,cabinets,representative:document.representative===cabinet.id?cabinets[0].id:document.representative});setCurrent(cabinets[0].id);setSelected(null);setDeleting(false);}}>삭제</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={discarding} onOpenChange={setDiscarding}><DialogContent><DialogHeader><DialogTitle>현재 편집을 버리고 다시 불러올까요?</DialogTitle><DialogDescription>저장하지 않은 변경은 사라집니다. 다른 화면에서 저장한 최신 구성을 불러옵니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setDiscarding(false)}>편집 유지</Button><Button onClick={()=>{alive.current=false;setDocument(saved);setDiscarding(false);window.location.reload();}}>최신 내용 불러오기</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
