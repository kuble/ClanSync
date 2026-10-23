import type { ReactNode } from "react";

const wood = { top: "#d5ae80", front: "#b48259", side: "#8e6145" };
const cream = { top: "#fff3dc", front: "#e7d5b7", side: "#c8b395" };
const mint = { top: "#b0d8be", front: "#86b49c", side: "#65927d" };
const dark = { top: "#56616a", front: "#3c4851", side: "#2d373f" };
const pink = { top: "#f2c0b4", front: "#db9b91", side: "#bd7d77" };
type Material = typeof wood;

function Block({ x = 60, y = 117, w = 32, d = 26, h = 20, material = wood, rear = false }: {
  x?: number; y?: number; w?: number; d?: number; h?: number; material?: Material; rear?: boolean;
}) {
  return <g stroke="#563f34" strokeOpacity=".12" strokeWidth=".8" strokeLinejoin="round">
    <path d={`M${x},${y - h}l${w},${-w / 2}v${h}l${-w},${w / 2}Z`} fill={rear ? material.side : material.front} />
    <path d={`M${x},${y - h}l${-d},${-d / 2}v${h}l${d},${d / 2}Z`} fill={rear ? material.front : material.side} />
    <path d={`M${x},${y - h}l${w},${-w / 2}l${-d},${-d / 2}l${-w},${w / 2}Z`} fill={material.top} />
  </g>;
}

function Legs({ y = 116, tall = 23, spread = 24 }: { y?: number; tall?: number; spread?: number }) {
  return <g stroke="#73533d" strokeWidth="5" strokeLinecap="round">
    <path d={`M${60 - spread},${y - 13}v${-tall}M60,${y}v${-tall}M${60 + spread},${y - 13}v${-tall}`} />
  </g>;
}

function Plant({ small = false, rear = false }: { small?: boolean; rear?: boolean }) {
  return <g transform={small ? "translate(28 13) scale(.48)" : undefined}>
    <path d="M60 95Q55 65 61 39M59 75Q41 64 38 47M60 65Q79 52 81 34" fill="none" stroke="#628a5d" strokeWidth="3" />
    <path d="M59 69C31 74 22 51 31 47C43 42 55 53 59 69M61 54C40 52 42 27 52 26C63 29 66 41 61 54M63 68C65 43 87 43 91 52C92 66 75 73 63 68M66 40C59 20 78 12 85 20C90 32 77 41 66 40" fill="#7da779" />
    <path d="M59 82C34 84 34 64 40 60C51 57 61 71 59 82M64 85C65 65 84 63 88 72C91 82 75 89 64 85" fill="#a6c393" />
    <path d="M41 90h39l-6 26q-14 8-27 0Z" fill={rear ? "#bc836c" : "#d99577"} />
    <ellipse cx="60.5" cy="90" rx="20" ry="7" fill="#efb297" />
    <ellipse cx="60.5" cy="89" rx="15" ry="4" fill="#765642" />
    <path d={rear ? "M69 98l-3 14" : "M48 98l3 14"} stroke="#f4c6aa" strokeWidth="3" strokeLinecap="round" />
  </g>;
}

function Monitor({ x = 44, y = 68, small = false }: { x?: number; y?: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .8 : 1})`}>
    <path d="M16 23v12m-9 4 18-9" stroke="#39454e" strokeWidth="4" strokeLinecap="round" />
    <path d="M0 0 33-16v30L0 30Z" fill="#354550" stroke="#2b3740" strokeWidth="3" strokeLinejoin="round" />
    <path d="M3 2 30-11v22L3 24Z" fill="#92bfc3" />
    <path d="M6 16 13 8l6 2L27-2M6 20l21-10" fill="none" stroke="#d0e6d4" strokeWidth="2" opacity=".8" />
  </g>;
}

function Books({ x = 54, y = 81 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    {[[0, "#9abdb4", 17], [6, "#ead6ac", 22], [13, "#d09c84", 20], [20, "#8d9fba", 15]].map(([offset, color, height]) =>
      <g key={offset}><path d={`M${offset} ${-Number(offset) / 2}v${-Number(height)}l5-2v${height}Z`} fill={String(color)} /><path d={`M${Number(offset) + 2} ${-Number(offset) / 2 - 5}v-5`} stroke="#fff6e3" strokeWidth="1" /></g>)}
  </g>;
}

function Trophy({ x = 67, y = 71, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-9-21c-13-3-10 12 0 10m18-10c13-3 10 12 0 10" fill="none" stroke="#d9b25f" strokeWidth="3" />
    <path d="M-9-25H9v12C9 0-9 0-9-13Z" fill="#edca78" />
    <path d="M0-3v10m-7 0H7" stroke="#bf9345" strokeWidth="4" strokeLinecap="round" />
    <path d="M-4-21v8" stroke="#fff0b7" strokeWidth="2" strokeLinecap="round" />
    <path d="M-10 10 0 5l10 5-10 5Z" fill="#82634d" />
  </g>;
}

function Furniture({ code, rear }: { code: string; rear: boolean }): ReactNode {
  switch (code) {
    case "mint-sofa": return <>
      <Legs y={119} tall={13} spread={32} />
      <Block x={64} y={111} w={42} d={49} h={19} material={mint} rear={rear} />
      <Block x={27} y={86} w={41} d={12} h={32} material={mint} rear={rear} />
      <Block x={63} y={96} w={30} d={34} h={8} material={{ ...mint, top: "#c1dfcb" }} rear={rear} />
      <Block x={64} y={106} w={41} d={10} h={31} material={mint} rear={rear} />
      <Block x={30} y={87} w={10} d={13} h={28} material={mint} rear={rear} />
      <path d={rear ? "M32 69l25-12M32 76l25-12" : "M48 75l15-7 9 12-15 7Z"} fill={rear ? "none" : "#fff0d8"} stroke={rear ? "#75a28a" : "#e3d2b2"} strokeWidth="2" />
    </>;
    case "low-table": return <>
      <Legs y={119} tall={20} spread={27} /><Block x={60} y={100} w={39} d={39} h={7} rear={rear} />
      <path d="M47 79l17-8 10 5-17 8Z" fill="#f0e4cc" /><path d="M47 79v3l10 5v-3" fill="#c8b99e" />
      <ellipse cx="77" cy="83" rx="8" ry="4" fill="#f6e8d0" /><path d="M72 77v6q5 5 10-1v-6" fill="#e8b5a0" /><ellipse cx="77" cy="76" rx="5" ry="2.5" fill="#785843" />
    </>;
    case "small-plant": return <Plant rear={rear} />;
    case "oak-desk": return <>
      <Legs y={119} tall={39} spread={31} /><Block x={60} y={83} w={43} d={43} h={7} rear={rear} />
      <Block x={83} y={103} w={16} d={22} h={30} rear={rear} /><path d="M87 82l7-3m-7 14 7-3" stroke="#e9ca96" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 66l17-8 10 5-17 8Z" fill="#fff0d7" /><Plant small />
    </>;
    case "reading-lamp": return <>
      <ellipse cx="60" cy="115" rx="19" ry="8" fill="#b18a55" /><ellipse cx="60" cy="112" rx="19" ry="8" fill="#dac18c" />
      <path d="M60 111V53q0-14 15-16" fill="none" stroke="#a58352" strokeWidth="4" />
      <path d="M61 28q12-8 25 1l10 26q-19 13-43 0Z" fill={rear ? "#dcc597" : "#f4dfb1"} stroke="#bca171" strokeWidth="1" />
      <ellipse cx="74.5" cy="55" rx="21.5" ry="7" fill="#fff0c9" /><ellipse cx="75" cy="55" rx="8" ry="3" fill="#ffe5a1" />
    </>;
    case "bookcase": return <>
      <Block x={51} y={119} w={45} d={20} h={88} rear={rear} />
      {!rear && <><path d="M55 38l36-18v79l-36 18Z" fill="#886247" /><Books x={58} y={64} /><Books x={58} y={92} />
        <path d="M54 69l39-20m-39 48 39-20" stroke="#d5ae80" strokeWidth="5" /><Plant small /></>}
      {rear && <path d="M56 38v68m10-73v68m10-73v68m10-73v68" stroke="#a0714e" strokeWidth="1" />}
    </>;
    case "single-bed": return <>
      <Block x={59} y={119} w={48} d={44} h={13} rear={rear} />
      <Block x={26} y={93} w={48} d={11} h={47} rear={rear} />
      <Block x={59} y={106} w={46} d={41} h={12} material={cream} rear={rear} />
      <Block x={59} y={103} w={45} d={24} h={11} material={mint} rear={rear} />
      <path d="M32 74l25-12q9-2 16 7l-25 12q-12 0-16-7" fill="#fff6e5" stroke="#e4d5bc" />
      <path d="M46 87l44-22m-39 26 43-22" stroke="#c8e2cd" strokeWidth="2" />
    </>;
    case "gaming-chair": return <>
      <path d="M61 111V89m0 19-21 10m21-10 22 9m-22-9 2 16m-2-16-13-6m13 6 16-8" stroke="#45535c" strokeWidth="4" strokeLinecap="round" />
      <g fill="#34424c"><circle cx="39" cy="119" r="4" /><circle cx="84" cy="118" r="4" /><circle cx="63" cy="125" r="4" /></g>
      <Block x={61} y={95} w={25} d={26} h={9} material={dark} rear={rear} />
      <path d="M40 77 36 39q-1-8 7-11l23-9q8-3 11 5l8 41-22 14Z" fill={rear ? "#43565b" : "#629b8c"} stroke="#394b50" strokeWidth="4" strokeLinejoin="round" />
      <path d={rear ? "M48 36l16-7m-9 42 16-7" : "M46 39l19-9m-17 17 20-9m-16 20 18-9"} stroke="#9dc4ae" strokeWidth="5" strokeLinecap="round" />
      <path d="M41 79v-8l-9-4m51 17v-9l9-5" stroke="#3f4d55" strokeWidth="5" strokeLinecap="round" />
    </>;
    case "dual-monitor": return <>
      <Legs y={119} tall={30} spread={32} /><Block x={60} y={90} w={43} d={43} h={6} material={wood} rear={rear} />
      <Monitor x={54} y={50} small /><Monitor x={25} y={64} small />
      <path d="M49 79l22-11 10 5-22 11Z" fill="#5e6d71" /><path d="M53 78l17-8m-13 10 17-8" stroke="#adc7bc" />
      <ellipse cx="84" cy="71" rx="4" ry="3" fill="#f2e5ce" />
      {rear && <path d="M29 58l16 9m13-25 15 9" stroke="#c4a680" strokeWidth="3" />}
    </>;
    case "trophy-cabinet": return <>
      <Block x={53} y={119} w={43} d={24} h={73} material={wood} rear={rear} />
      {!rear && <><path d="M58 49 91 33v65l-33 16Z" fill="#719b9a" /><Trophy x={74} y={65} scale={.7} /><Trophy x={74} y={96} scale={.65} />
        <path d="M57 83l36-18" stroke="#d7b787" strokeWidth="4" /><path d="M61 52v54m15-61v60" stroke="#e8e1ca" strokeWidth="2" opacity=".65" /><path d="M84 59v11" stroke="#f1cf81" strokeWidth="2" /></>}
      {rear && <path d="M57 54l32-16v57l-32 16Z" fill="none" stroke="#a0714e" strokeWidth="2" />}
    </>;
    case "cat-cushion": return <>
      <ellipse cx="61" cy="111" rx="34" ry="15" fill="#ca917e" /><ellipse cx="61" cy="106" rx="34" ry="15" fill="#efc2ae" />
      <path d="M39 101q-12-19 0-28l-1-14 16 9q10-2 20 0l14-9-1 17q10 13-2 23-23 15-46 2" fill={rear ? "#d8bd9e" : "#f3ddbe"} />
      <path d="M40 65l4 9 6-4m28-1 6-5-2 10" fill="#dfb29d" />
      <path d={rear ? "M51 77q11-9 24 0m-23 6q10-7 22-1" : "M47 83q3 4 6 0m16 0q3 4 6 0m-16 7 3 2 3-2m-3 2v4"} stroke="#9d7a60" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M81 102q25-11 15-19" stroke="#e3c7a3" strokeWidth="7" fill="none" strokeLinecap="round" />
    </>;
    case "arcade-machine": return <>
      <Block x={57} y={120} w={32} d={26} h={82} material={mint} rear={rear} />
      <Block x={57} y={45} w={32} d={26} h={18} material={pink} rear={rear} />
      {!rear && <><path d="M61 49l24-12v30L61 79Z" fill="#344c55" /><path d="M65 51l16-8v18l-16 8Z" fill="#a2c5b6" />
        <path d="m68 59 4-5 4 1 3-7" stroke="#f2df99" strokeWidth="2" fill="none" /><Block x={57} y={92} w={32} d={9} h={10} material={pink} />
        <path d="M68 80v-7" stroke="#5f6271" strokeWidth="2" /><circle cx="68" cy="73" r="3" fill="#f3df9b" /><ellipse cx="80" cy="72" rx="3" ry="1.8" fill="#fff0d3" /><path d="M69 103l9-4" stroke="#4a7165" strokeWidth="3" /></>}
      {rear && <path d="M64 57l18-9m-18 15 18-9m-18 15 18-9M69 92l7-3v12l-7 3Z" stroke="#557f70" strokeWidth="3" fill="none" />}
    </>;
    case "speaker": return <>
      <Block x={53} y={119} w={31} d={24} h={68} material={wood} rear={rear} />
      <path d="M57 53l23-11v60l-23 11Z" fill={rear ? "#785943" : "#405257"} />
      {rear ? <path d="M64 86l8-4m-8 10 8-4" stroke="#a78b6b" strokeWidth="3" /> : <>
        <ellipse cx="68" cy="86" rx="9" ry="13" transform="rotate(15 68 86)" fill="#283d44" stroke="#80948b" strokeWidth="2" /><ellipse cx="68" cy="86" rx="4" ry="6" fill="#a3b3a4" />
        <ellipse cx="68" cy="60" rx="5" ry="7" transform="rotate(15 68 60)" fill="#d1c4a5" /><circle cx="76" cy="101" r="1.5" fill="#c5d8a5" /></>}
    </>;
    case "coffee-cart": return <>
      <Legs y={116} tall={47} spread={24} /><Block x={60} y={104} w={31} d={31} h={5} rear={rear} /><Block x={60} y={74} w={35} d={35} h={6} rear={rear} />
      <Block x={53} y={60} w={24} d={18} h={28} material={cream} rear={rear} /><path d="M58 37l14-7v10l-14 7Z" fill="#798e88" /><path d="M60 52l11-5" stroke="#8e7d68" strokeWidth="3" />
      <path d="M67 58v8q5 4 9-3v-8" fill="#f1d7b5" /><path d="M77 58q7-2 4 3l-5 2" fill="none" stroke="#c6ab88" strokeWidth="2" /><Books x={49} y={96} />
      <g fill="#645347"><circle cx="36" cy="107" r="3" /><circle cx="60" cy="119" r="3" /><circle cx="84" cy="107" r="3" /></g>
    </>;
    case "record-player": return <>
      <Legs y={118} tall={25} spread={27} /><Block x={60} y={96} w={38} d={36} h={14} rear={rear} />
      <path d="M24 62V35l37-18 36 18v28L61 45Z" fill="#bb8b65" stroke="#8b6248" strokeWidth="2" strokeLinejoin="round" /><path d="M31 38l30-14 28 14v11L61 36 31 50Z" fill="#936b4f" />
      <ellipse cx="58" cy="65" rx="21" ry="10" fill="#3b4b50" /><ellipse cx="58" cy="65" rx="15" ry="7" fill="none" stroke="#73817b" strokeWidth="1" /><ellipse cx="58" cy="65" rx="6" ry="3" fill="#dfb7a0" />
      <path d="M82 56l-6 12-10 2" fill="none" stroke="#e2cca2" strokeWidth="2" /><circle cx="81" cy="77" r="2.5" fill="#e3c783" />
    </>;
    case "star-sculpture": return <>
      <Block x={60} y={119} w={24} d={24} h={11} material={cream} rear={rear} /><Block x={60} y={104} w={16} d={16} h={22} material={cream} rear={rear} />
      <path d="M61 27 70 49 94 47 79 66 86 88 63 79 44 93 45 69 25 55 49 49Z" fill={rear ? "#d4ac64" : "#edce83"} stroke="#be984f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M61 27 63 61 94 47 63 61 86 88 63 61 44 93 63 61 25 55" fill="none" stroke="#fff0b4" strokeWidth="2" opacity=".7" />
    </>;
    default: return <Plant />;
  }
}

export function FurnitureArt({ code, rotation = 0, className }: { code: string; rotation?: number; className?: string }) {
  const direction = ((rotation % 4) + 4) % 4;
  return <svg viewBox="0 0 120 140" className={className} aria-hidden="true" role="presentation" focusable="false">
    <ellipse cx="61" cy="120" rx="42" ry="13" fill="#514437" opacity=".13" />
    <g transform={direction % 2 ? "translate(120 0) scale(-1 1)" : undefined}>
      <Furniture code={code} rear={direction >= 2} />
    </g>
  </svg>;
}
