"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Layers, Package, Plus, ShoppingBag, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveShowcaseAction } from "@/app/actions/profile-showcase";
import { BACKGROUNDS, TEMPLATES, QA_CABINET_LIMIT, usedQuantity, type ShowcaseCabinet, type ShowcaseDocument, type ShowcaseItem, type ShowcaseState, type ShowcaseProduct } from "@/lib/showcase/domain";
import { ShowcaseAutosave } from "@/lib/showcase/autosave";
import { ShowcaseArt } from "./showcase-art";
import { ShowcaseTemplatePreview } from "./showcase-template-preview";
import { ShowcaseScene, contains, dropPosition } from "./showcase-scene";
import styles from "./showcase.module.css";

const FILTERS = [{id:"all",name:"전체"},{id:"goods",name:"굿즈"},{id:"decor",name:"장식"},{id:"light",name:"조명"},{id:"wallpaper",name:"벽지"},{id:"template",name:"선반"}] as const;
type Category = typeof FILTERS[number]["id"];
type DragPoint = { x:number; y:number; product:ShowcaseProduct; outsideScene:boolean; overDrawer:boolean; fromInventory:boolean };

export function ShowcaseEditor({ initial, userId, readOnly }: { initial: ShowcaseState; userId: string; readOnly: boolean }) {
  const router = useRouter();
  const [autosave] = useState(()=>new ShowcaseAutosave(initial.document,initial.revision,(document,revision)=>new Promise(resolve=>{
    startTransition(async()=>{
      try { resolve(await saveShowcaseAction(document,revision,userId)); }
      catch { resolve({ok:false,error:"자동 저장하지 못했습니다. 변경 내용은 유지됩니다. 다시 시도해 주세요."}); }
    });
  })));
  const saved = useSyncExternalStore(autosave.subscribe,autosave.getSnapshot,autosave.getSnapshot);
  const document = saved.document;
  const [current,setCurrent] = useState(document.representative);
  const [selected,setSelected] = useState<string|null>(null);
  const [manager,setManager] = useState(false);
  const [deleting,setDeleting] = useState(false);
  const [discarding,setDiscarding] = useState(false);
  const [category,setCategory] = useState<Category>("all");
  const [query,setQuery] = useState("");
  const [availability,setAvailability] = useState("all");
  const [hovered,setHovered] = useState(false);
  const [focused,setFocused] = useState(false);
  const [touchOpen,setTouchOpen] = useState(false);
  const [dragPoint,setDragPoint] = useState<DragPoint|null>(null);
  const [preview,setPreview] = useState<ShowcaseItem|null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const pointerType = useRef("mouse");
  const inventoryDrag = useRef<{product:ShowcaseProduct;x:number;y:number;moved:boolean}|null>(null);
  const suppressClick = useRef(false);
  const leaving = useRef(false);
  const drawerOpen = (hovered || focused || touchOpen) && !dragPoint?.fromInventory;
  const cabinet = document.cabinets.find(c=>c.id===current) ?? document.cabinets[0];
  const selectedItem = cabinet.items.find(i=>i.id===selected);
  const selectedProduct = initial.catalog.find(p=>p.id===selectedItem?.catalogId);

  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(!leaving.current && (autosave.getSnapshot().dirty || autosave.getSnapshot().saving))event.preventDefault();};
    // Wait for the newest placement before an in-app link unmounts the editor.
    const navigate=(event:MouseEvent)=>{
      if(event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
      const link=event.target instanceof Element ? event.target.closest("a[href]") : null;
      if(!(link instanceof HTMLAnchorElement) || link.target==="_blank" || link.hasAttribute("download"))return;
      const url=new URL(link.href);
      const state=autosave.getSnapshot();
      if(url.origin!==location.origin || (url.pathname===location.pathname && url.search===location.search) || (!state.dirty && !state.saving))return;
      event.preventDefault();event.stopPropagation();
      void autosave.flush().then(ok=>{if(ok)router.push(url.pathname+url.search+url.hash);});
    };
    window.addEventListener("beforeunload",warn);
    window.document.addEventListener("click",navigate,true);
    return ()=>{window.removeEventListener("beforeunload",warn);window.document.removeEventListener("click",navigate,true);void autosave.flush();};
  },[autosave,router]);

  const inDrawer = useCallback((x:number,y:number)=>contains(drawerRef.current?.getBoundingClientRect(),x,y) || (drawerPanelRef.current?.getAttribute("aria-hidden")==="false" && contains(drawerPanelRef.current.getBoundingClientRect(),x,y)),[]);
  const trackDrag = useCallback((point:{x:number;y:number;product:ShowcaseProduct}|null,fromInventory=false)=>{
    if(!point){setDragPoint(null);if(pointerType.current!=="mouse"){setTouchOpen(false);setHovered(false);}return;}
    const overDrawer=inDrawer(point.x,point.y);
    setHovered(overDrawer);setFocused(false);setTouchOpen(false);
    setDragPoint({...point,fromInventory,overDrawer,outsideScene:overDrawer || !contains(sceneRef.current?.getBoundingClientRect(),point.x,point.y)});
  },[inDrawer]);

  useEffect(()=>{
    if(!dragPoint)return;
    let frame:number;
    const scroll=()=>{
      if(!dragPoint.overDrawer){
        const delta=dragPoint.y<56?-10:dragPoint.y>window.innerHeight-56?10:0;
        if(delta){
          const before=window.scrollY;window.scrollBy(0,delta);
          if(window.scrollY!==before){
            trackDrag(dragPoint,dragPoint.fromInventory);
            if(dragPoint.fromInventory){
              const pos=dropPosition(sceneRef.current?.getBoundingClientRect(),cabinet,dragPoint.product,dragPoint.x,dragPoint.y);
              setPreview(pos?{id:"preview",catalogId:dragPoint.product.id,shelf:pos.shelf,x:pos.x,layer:8}:null);
            }
          }
        }
      }
      frame=requestAnimationFrame(scroll);
    };
    frame=requestAnimationFrame(scroll);
    return ()=>cancelAnimationFrame(frame);
  },[dragPoint,cabinet,trackDrag]);
  useEffect(()=>{
    const cancel=()=>{if(inventoryDrag.current?.moved)suppressClick.current=true;inventoryDrag.current=null;setDragPoint(null);setPreview(null);setHovered(false);setFocused(false);setTouchOpen(false);};
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape")cancel();};
    const outside=(event:PointerEvent)=>{if(event.pointerType!=="mouse" && event.target instanceof Node && !drawerRef.current?.contains(event.target))setTouchOpen(false);};
    window.addEventListener("keydown",key);window.addEventListener("blur",cancel);window.document.addEventListener("pointerdown",outside);
    return ()=>{window.removeEventListener("keydown",key);window.removeEventListener("blur",cancel);window.document.removeEventListener("pointerdown",outside);};
  },[]);

  function change(update:(document:ShowcaseDocument)=>ShowcaseDocument){if(!readOnly)autosave.edit(update(autosave.getSnapshot().document));}
  function updateCabinet(patch:Partial<ShowcaseCabinet>){change(d=>({...d,cabinets:d.cabinets.map(c=>c.id===cabinet.id?{...c,...patch}:c)}));}
  function updateItem(id:string,patch:Partial<ShowcaseItem>){change(d=>({...d,cabinets:d.cabinets.map(c=>c.id===cabinet.id?{...c,items:c.items.map(i=>i.id===id?{...i,...patch}:i)}:c)}));}
  function storeItem(id:string){change(d=>({...d,cabinets:d.cabinets.map(c=>c.id===cabinet.id?{...c,items:c.items.filter(i=>i.id!==id)}:c)}));setSelected(null);}
  function add(product:ShowcaseProduct,position?:{shelf:number;x:number}){
    const latest=autosave.getSnapshot().document;
    const target=latest.cabinets.find(c=>c.id===cabinet.id)!;
    if(product.kind==="template" || (initial.owned[product.id]??0)<=usedQuantity(latest,product.id) || target.items.length>=60)return;
    const id=crypto.randomUUID();
    updateCabinet({items:[...target.items,{id,catalogId:product.id,shelf:position?.shelf??1,x:position?.x??50,layer:Math.min(8,target.items.length)}]});setSelected(id);
  }
  function addCabinet(copy=false){
    if(document.cabinets.length>=QA_CABINET_LIMIT)return;
    const id=crypto.randomUUID();
    const remaining=Object.fromEntries(initial.catalog.map(p=>[p.id,(initial.owned[p.id]??0)-usedQuantity(document,p.id)]));
    const items=copy?cabinet.items.filter(i=>remaining[i.catalogId]-- >0).map(i=>({...i,id:crypto.randomUUID()})):[];
    change(d=>({...d,cabinets:[...d.cabinets,{...cabinet,id,name:`진열장 ${d.cabinets.length+1}`,items}]}));setCurrent(id);setSelected(null);
  }
  const matches=(name:string,kind:Category)=> (category==="all" || category===kind) && name.includes(query.trim());
  const matchesState=(placed:boolean)=>availability==="all" || (availability==="placed"?placed:!placed);
  const products=initial.catalog.filter(p=>p.kind!=="template" && (initial.owned[p.id]??0)>0 && matches(p.name,p.kind==="goods"?"goods":p.kind==="light"?"light":"decor") && (availability==="all" || (availability==="placed"?usedQuantity(document,p.id)>0:(initial.owned[p.id]??0)>usedQuantity(document,p.id))));
  const wallpapers=BACKGROUNDS.filter(b=>matches(b.name,"wallpaper") && matchesState(cabinet.background===b.id));
  const templates=TEMPLATES.filter(t=>(!t.productId || initial.owned[t.productId]>0) && matches(t.name,"template") && matchesState(cabinet.template===t.id));

  return <section className={styles.container} aria-label="진열장" onPointerDownCapture={event=>{pointerType.current=event.pointerType;setFocused(false);}}>
    <header className={styles.heading}><h2>진열장{document.representative===cabinet.id && <Star size={14} aria-hidden="true"/>}</h2></header>
    <span className="sr-only" role="status" data-testid="showcase-save-status">{saved.error?"저장 실패":saved.saving||saved.dirty?"저장 중":"저장 완료"}</span>
    {saved.error && <div className={styles.error} role="alert">{saved.error}<Button size="sm" variant="outline" disabled={saved.saving} onClick={()=>void autosave.retry()}>자동 저장 다시 시도</Button><Button size="sm" variant="ghost" disabled={saved.saving} onClick={()=>setDiscarding(true)}>최신 내용 불러오기</Button></div>}
    <ShowcaseScene cabinet={cabinet} catalog={initial.catalog} sceneRef={sceneRef} preview={preview} selected={selected}
      select={readOnly?undefined:setSelected} move={readOnly?undefined:(id,x,shelf)=>updateItem(id,{x,shelf})} onDrag={trackDrag}
      storeAt={(id,x,y)=>{if(inDrawer(x,y)){storeItem(id);return true;}return false;}}/>
    {!readOnly && <div ref={drawerRef} className={`${styles.drawer} ${dragPoint?.overDrawer?styles.drawerTarget:""}`} data-testid="showcase-drawer" data-open={drawerOpen} aria-label="보관함"
      onPointerEnter={event=>{if(event.pointerType==="mouse"){setHovered(true);setTouchOpen(false);}}}
      onPointerLeave={event=>{if(event.pointerType==="mouse"){setHovered(false);setFocused(false);setTouchOpen(false);}}}
      onFocusCapture={event=>{if(event.target.matches(":focus-visible"))setFocused(true);}}
      onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
      <div className={styles.inventoryHeading}>
        <button type="button" className={styles.drawerToggle} aria-expanded={drawerOpen} aria-controls="showcase-inventory-panel" onClick={event=>{if(pointerType.current!=="mouse" || event.detail===0){setTouchOpen(open=>!open);setFocused(false);setHovered(false);}else setHovered(true);}}><Package size={17}/><strong>보관함</strong><ChevronDown size={15} style={{transform:drawerOpen?"rotate(180deg)":undefined}}/></button>
        <span className={styles.drawerHint}>{dragPoint && !dragPoint.fromInventory?"여기에 놓아 보관하기":"굿즈 · 벽지 · 선반"}</span>
        <button className={styles.manageButton} type="button" aria-label="진열장 관리" onClick={()=>setManager(true)}><Layers size={17}/></button>
        <Link href="/store#showcase" aria-label="선반·굿즈 상점"><ShoppingBag size={17}/><span>상점</span></Link>
      </div>
      <div ref={drawerPanelRef} id="showcase-inventory-panel" className={styles.drawerContent} aria-hidden={!drawerOpen} inert={!drawerOpen && !dragPoint?.fromInventory}>
        <div className={styles.filters} role="group" aria-label="보관함 분류">{FILTERS.map(f=><button key={f.id} type="button" aria-pressed={category===f.id} onClick={()=>setCategory(f.id)}>{f.name}</button>)}</div>
        <div className={styles.inventorySearch}><input aria-label="보관함 검색" placeholder="이름으로 찾기" value={query} onChange={event=>setQuery(event.target.value)}/><select aria-label="보관함 배치 상태" value={availability} onChange={event=>setAvailability(event.target.value)}><option value="all">전체 상태</option><option value="stored">보관 중</option><option value="placed">전시 중</option></select><button type="button" aria-label="이전 보관함 항목" onClick={()=>inventoryRef.current?.scrollBy({left:-280,behavior:"smooth"})}><ChevronLeft size={16}/></button><button type="button" aria-label="다음 보관함 항목" onClick={()=>inventoryRef.current?.scrollBy({left:280,behavior:"smooth"})}><ChevronRight size={16}/></button></div>
        <div ref={inventoryRef} className={styles.inventory}>
          {products.map(product=>{
            const spare=(initial.owned[product.id]??0)-usedQuantity(document,product.id);
            const placed=cabinet.items.filter(i=>i.catalogId===product.id);
            const canTake=spare>0 && availability!=="placed";
            return <button key={product.id} type="button" aria-label={`${product.name} ${canTake?"꺼내기":"배치 보기"}`} disabled={canTake?cabinet.items.length>=60:!placed.length}
              onClick={event=>{if(suppressClick.current && event.detail!==0){suppressClick.current=false;return;}if(canTake)add(product);else setSelected(placed[(placed.findIndex(i=>i.id===selected)+1)%placed.length]?.id??null);}}
              onPointerDown={event=>{if(!canTake || (event.pointerType==="mouse" && event.button!==0))return;suppressClick.current=false;inventoryDrag.current={product,x:event.clientX,y:event.clientY,moved:false};event.currentTarget.setPointerCapture(event.pointerId);}}
              onPointerMove={event=>{const drag=inventoryDrag.current;if(!drag)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6)drag.moved=true;if(!drag.moved)return;trackDrag({x:event.clientX,y:event.clientY,product},true);const pos=inDrawer(event.clientX,event.clientY)?null:dropPosition(sceneRef.current?.getBoundingClientRect(),cabinet,product,event.clientX,event.clientY);setPreview(pos?{id:"preview",catalogId:product.id,shelf:pos.shelf,x:pos.x,layer:8}:null);}}
              onPointerUp={event=>{if(inventoryDrag.current?.moved){suppressClick.current=true;const pos=inDrawer(event.clientX,event.clientY)?null:dropPosition(sceneRef.current?.getBoundingClientRect(),cabinet,product,event.clientX,event.clientY);if(pos)add(product,pos);}inventoryDrag.current=null;setPreview(null);trackDrag(null);}}
              onPointerCancel={()=>{suppressClick.current=true;inventoryDrag.current=null;setPreview(null);trackDrag(null);}}
            ><ShowcaseArt sprite={product.sprite} imagePath={product.image_path}/><strong>{product.name}</strong><small>{canTake?`보관 ${spare}개`:placed.length?`전시 ${placed.length}개`:"다른 진열장에 전시 중"}</small></button>;
          })}
          {wallpapers.map(background=><button type="button" key={background.id} aria-label={`${background.name} 벽지 적용`} aria-pressed={cabinet.background===background.id} onClick={()=>updateCabinet({background:background.id})}><span className={`${styles.wallpaperSwatch} ${styles[background.id]}`}><span className={styles.backboard}/></span><strong>{background.name}</strong><small>{cabinet.background===background.id?"사용 중":"벽지"}</small></button>)}
          {templates.map(template=><button type="button" key={template.id} aria-label={`${template.name} 선반 적용`} aria-pressed={cabinet.template===template.id} onClick={()=>updateCabinet({template:template.id})}><ShowcaseTemplatePreview template={template.id}/><strong>{template.name}</strong><small>{cabinet.template===template.id?"사용 중":template.productId?"보유 선반":"기본 선반"}</small></button>)}
          {!products.length && !wallpapers.length && !templates.length && <p className={styles.inventoryEmpty}>해당하는 항목이 없어요.</p>}
        </div>
        {selectedItem && selectedProduct && <div className={styles.itemTools} aria-label="선택한 굿즈 조절"><strong>{selectedProduct.name}</strong><button type="button" disabled={selectedItem.layer>=8} onClick={()=>updateItem(selectedItem.id,{layer:selectedItem.layer+1})}>앞으로</button><button type="button" disabled={selectedItem.layer<=0} onClick={()=>updateItem(selectedItem.id,{layer:selectedItem.layer-1})}>뒤로</button>{selectedProduct.kind==="label" && <input key={selectedItem.id} aria-label="명패 문구" maxLength={20} defaultValue={selectedItem.text??""} onBlur={event=>updateItem(selectedItem.id,{text:event.target.value})} onKeyDown={event=>{if(event.key==="Enter")event.currentTarget.blur();}}/>}<button type="button" onClick={()=>storeItem(selectedItem.id)}>보관함에 넣기</button><button type="button" aria-label="굿즈 선택 해제" onClick={()=>setSelected(null)}><X size={14}/></button></div>}
      </div>
    </div>}
    {readOnly && document.cabinets.length>1 && <nav className={styles.navigation} aria-label="저장한 진열장"><select aria-label="진열장 선택" value={cabinet.id} onChange={event=>setCurrent(event.target.value)}>{document.cabinets.map((c,i)=><option key={c.id} value={c.id}>진열장 {i+1}{document.representative===c.id?" · 대표":""}</option>)}</select></nav>}
    {dragPoint?.outsideScene && <div className={styles.dragGhost} style={{left:dragPoint.x,top:dragPoint.y}} aria-hidden="true"><ShowcaseArt sprite={dragPoint.product.sprite} imagePath={dragPoint.product.image_path}/></div>}
    <Dialog open={manager} onOpenChange={setManager}><DialogContent><DialogHeader><DialogTitle>진열장 관리</DialogTitle><DialogDescription>여러 구성을 보관하고 방문자에게 먼저 보여줄 진열장을 고르세요.</DialogDescription></DialogHeader><select aria-label="진열장 선택" value={cabinet.id} onChange={event=>{setCurrent(event.target.value);setSelected(null);}}>{document.cabinets.map((c,i)=><option key={c.id} value={c.id}>진열장 {i+1}{document.representative===c.id?" · 대표":""}</option>)}</select><div className={styles.actions}><Button variant="outline" disabled={document.cabinets.length>=QA_CABINET_LIMIT} onClick={()=>addCabinet()}><Plus size={14}/>새 진열장</Button><Button variant="outline" disabled={document.cabinets.length>=QA_CABINET_LIMIT} onClick={()=>addCabinet(true)}>구성 복사</Button><Button variant="outline" onClick={()=>change(d=>({...d,representative:cabinet.id}))}>대표로 설정</Button><Button variant="ghost" disabled={document.cabinets.length<2} onClick={()=>{setManager(false);setDeleting(true);}}>진열장 삭제</Button></div><Link href="/profile/miniroom" className="text-sm text-muted-foreground underline">기존 미니룸 보관함</Link></DialogContent></Dialog>
    <Dialog open={deleting} onOpenChange={setDeleting}><DialogContent><DialogHeader><DialogTitle>이 진열장을 삭제할까요?</DialogTitle><DialogDescription>놓아둔 굿즈는 보관함으로 돌아갑니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setDeleting(false)}>취소</Button><Button variant="destructive" onClick={()=>{const cabinets=document.cabinets.filter(c=>c.id!==cabinet.id);change(d=>({...d,cabinets,representative:d.representative===cabinet.id?cabinets[0].id:d.representative}));setCurrent(cabinets[0].id);setSelected(null);setDeleting(false);}}>삭제</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={discarding} onOpenChange={setDiscarding}><DialogContent><DialogHeader><DialogTitle>저장하지 못한 변경을 버리고 다시 불러올까요?</DialogTitle><DialogDescription>다른 화면에서 저장한 최신 구성을 불러옵니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setDiscarding(false)}>편집 유지</Button><Button onClick={()=>{leaving.current=true;window.location.reload();}}>최신 내용 불러오기</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
