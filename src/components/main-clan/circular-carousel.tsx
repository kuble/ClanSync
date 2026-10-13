"use client";

// Adapted from the user-supplied React Bits CircularCarousel: orbit geometry,
// damped spring, drag momentum and snapping. License: ./react-bits-LICENSE.md.
import {useEffect,useRef,useState,type ReactNode} from "react";
import {ArrowLeft,ArrowRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import styles from "./circular-carousel.module.css";

type Item={id:string;label:string;content:ReactNode};
const wrap=(angle:number)=>((angle+180)%360+360)%360-180;
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

export function CircularCarousel({items,onItemClick}:{items:Item[];onItemClick:(id:string)=>void}){
  const root=useRef<HTMLDivElement>(null),camera=useRef<HTMLDivElement>(null),ring=useRef<HTMLDivElement>(null);
  const cards=useRef(new Map<string,HTMLButtonElement>());
  const [active,setActive]=useState(0);
  const state=useRef({angle:0,target:0,velocity:0,active:0,frame:0,last:0,width:720,reduced:false,drag:null as null|{id:number;x:number;y:number;angle:number;lastX:number;lastTime:number;moved:boolean},suppress:false});
  const wake=useRef(()=>{}),draw=useRef(()=>{});
  const step=360/items.length;
  const settings=useRef({items,step});

  useEffect(()=>{
    settings.current={items,step};
    state.current.target=-Math.min(state.current.active,items.length-1)*step;
    wake.current();
  },[items,step]);

  useEffect(()=>{
    const element=root.current,s=state.current;
    if(!element)return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let stopped=false;
    const paint=()=>{
      const {items:list,step:gap}=settings.current;
      const width=clamp(s.width*.54,160,240),height=width*1.25;
      const radius=Math.max((width+42)/(2*Math.sin(Math.PI/Math.max(list.length,3))),width*.7);
      element.style.perspective=Math.max(1400,radius*2.5)+'px';
      if(camera.current)camera.current.style.transform=`translateZ(${-radius}px) rotateX(-10deg)`;
      if(ring.current)ring.current.style.transform=`rotateY(${s.angle}deg)`;
      list.forEach((item,i)=>{
        const card=cards.current.get(item.id);if(!card)return;
        const angle=i*gap,world=wrap(angle+s.angle),facing=Math.cos(world*Math.PI/180);
        // Billboard each paper card as in the supplied orbit preset.
        card.style.transform=`rotateY(${angle}deg) translateZ(${radius}px) rotateY(${-world}deg)`;
        card.style.width=width+'px';card.style.height=height+'px';card.style.left=-width/2+'px';card.style.top=-height/2+'px';
        card.style.visibility=Math.abs(world)>115?'hidden':'visible';
        card.style.opacity=String(clamp((facing+1)/2,.15,1));
        card.style.pointerEvents=Math.abs(world)>100?'none':'auto';
      });
      const next=((Math.round(-s.angle/gap)%list.length)+list.length)%list.length;
      if(next!==s.active){s.active=next;setActive(next);}
      element.dataset.ready='true';
    };
    draw.current=paint;
    const animate=(now:number)=>{
      s.frame=0;if(stopped)return;
      let dt=s.last?Math.min((now-s.last)/1000,.05):1/60;s.last=now;
      if(s.reduced){s.angle=s.target;s.velocity=0;}
      else if(!s.drag?.moved){
        const damping=2*Math.sqrt(118);
        while(dt>0){const h=Math.min(dt,1/240);s.velocity+=(118*(s.target-s.angle)-damping*s.velocity)*h;s.angle+=s.velocity*h;dt-=h;}
        if(Math.abs(s.target-s.angle)<.01&&Math.abs(s.velocity)<.05){s.angle=s.target;s.velocity=0;}
      }
      paint();
      if(!document.hidden&&(Math.abs(s.target-s.angle)>.01||Math.abs(s.velocity)>.05)&&!s.drag?.moved)s.frame=requestAnimationFrame(animate);
      else s.last=0;
    };
    wake.current=()=>{if(!s.frame&&!document.hidden)s.frame=requestAnimationFrame(animate);};
    const measure=()=>{s.width=element.getBoundingClientRect().width;paint();};
    const reduce=()=>{s.reduced=motion.matches;if(s.reduced)s.angle=s.target;paint();wake.current();};
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(s.frame);s.frame=0;s.last=0;}else wake.current();};
    const wheel=(event:WheelEvent)=>{
      if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)||settings.current.items.length<2)return;
      event.preventDefault();s.target-=Math.sign(event.deltaX)*settings.current.step;wake.current();
    };
    const resize=new ResizeObserver(measure);resize.observe(element);
    motion.addEventListener('change',reduce);document.addEventListener('visibilitychange',visibility);
    element.addEventListener('wheel',wheel,{passive:false});measure();reduce();
    return ()=>{stopped=true;cancelAnimationFrame(s.frame);s.frame=0;resize.disconnect();motion.removeEventListener('change',reduce);document.removeEventListener('visibilitychange',visibility);element.removeEventListener('wheel',wheel);wake.current=()=>{};draw.current=()=>{};};
  },[items.length]);

  function move(delta:number){state.current.target-=delta*step;wake.current();}
  function focus(index:number){const s=state.current;let target=-index*step;target+=360*Math.round((s.angle-target)/360);s.target=target;wake.current();}
  function release(event:React.PointerEvent<HTMLDivElement>,cancelled=false){
    const s=state.current,d=s.drag;if(!d||d.id!==event.pointerId)return;
    s.drag=null;if(!d.moved)return;s.suppress=true;
    if(cancelled)s.velocity=0;
    s.target=Math.round((s.angle+(s.reduced?0:s.velocity*.12))/step)*step;wake.current();
  }
  return <div className="space-y-4"><div ref={root} className={styles.carousel} role="region" aria-roledescription="carousel" aria-label="원형 추억 앨범" tabIndex={0}
    onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();focus(e.key==='Home'?0:items.length-1);}else if((e.key==='Enter'||e.key===' ')&&e.target===e.currentTarget){e.preventDefault();onItemClick(items[state.current.active].id);}}}
    onPointerDown={e=>{if(e.button!==0||items.length<2)return;state.current.suppress=false;state.current.drag={id:e.pointerId,x:e.clientX,y:e.clientY,angle:state.current.angle,lastX:e.clientX,lastTime:performance.now(),moved:false};}}
    onPointerMove={e=>{
      const s=state.current,d=s.drag;if(!d||d.id!==e.pointerId)return;
      const dx=e.clientX-d.x;if(!d.moved){if(Math.abs(dx)<5)return;if(e.pointerType!=='mouse'&&Math.abs(e.clientY-d.y)>Math.abs(dx)*1.2){s.drag=null;return;}d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);cancelAnimationFrame(s.frame);s.frame=0;}
      const perPixel=step/Math.max(160,s.width*.5),now=performance.now();
      s.velocity=clamp((e.clientX-d.lastX)*perPixel/Math.max((now-d.lastTime)/1000,.008),-720,720);
      s.angle=d.angle+dx*perPixel;d.lastX=e.clientX;d.lastTime=now;draw.current();
    }} onPointerUp={e=>release(e)} onPointerCancel={e=>release(e,true)}>
    <div className={styles.stage}><div ref={camera} className={styles.camera}><div ref={ring} className={styles.ring}>{items.map((item,index)=><button key={item.id} ref={node=>{if(node)cards.current.set(item.id,node);else cards.current.delete(item.id);}} data-photo-id={item.id} data-active={active===index} tabIndex={active===index?0:-1} className={styles.card} type="button" aria-label={item.label+' · '+(index+1)+' / '+items.length}
      onClick={()=>{const s=state.current;if(s.suppress){s.suppress=false;return;}if(s.active===index)onItemClick(item.id);else focus(index);}}>{item.content}</button>)}</div></div></div>
    <p className="sr-only" aria-live="polite">{items[active]?.label} · {active+1} / {items.length}</p>
  </div><div className="flex items-center justify-center gap-5"><Button variant="outline" size="icon" disabled={items.length<2} aria-label="이전 추억" onClick={()=>move(-1)}><ArrowLeft/></Button><span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">{active+1} / {items.length}</span><Button variant="outline" size="icon" disabled={items.length<2} aria-label="다음 추억" onClick={()=>move(1)}><ArrowRight/></Button></div></div>;
}
