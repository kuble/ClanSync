import { notFound } from "next/navigation";
import styles from "./preview.module.css";

const palettes = [
  { name: "비취와 백자", front: "#62CBB3", back: "#357F79", ink: "#E5EBE7", join: "#83D3C1" },
  { name: "빙하 블루", front: "#95CAED", back: "#547AAC", ink: "#DAE5F1", join: "#91BCEC" },
  { name: "앰버와 먹색", front: "#EAB872", back: "#A67F57", ink: "#EFE6D7", join: "#E4B476" },
  { name: "라일락과 청록", front: "#B4A6E2", back: "#78B5B4", ink: "#EAE7F1", join: "#B4A6E2" },
  { name: "구리와 장밋빛", front: "#DD9787", back: "#9B666C", ink: "#E9DBD7", join: "#E2A99A" },
  { name: "실버 모노", front: "#CED4D3", back: "#84918F", ink: "#DCE0DF", join: "#A5B3B0" },
] as const;

// Map a channel of the original artwork onto two inks, preserving its alpha and edges.
function InkFilter({ id, low, high, channel, start, end }: {
  id: string; low: string; high: string; channel: number; start: number; end: number;
}) {
  const rows = [1, 3, 5].map(offset => {
    const base = parseInt(low.slice(offset, offset + 2), 16);
    const slope = (parseInt(high.slice(offset, offset + 2), 16) - base) / (end - start);
    const row = [0, 0, 0, 0, (base - start * slope) / 255];
    row[channel] = slope;
    return row.join(" ");
  });
  return <filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix values={rows.join(" ") + " 0 0 0 1 0"} /></filter>;
}

function Lockup({ index, small = false }: { index: number; small?: boolean }) {
  const p = palettes[index], id = `ink-${index}-${small ? "small" : "large"}`;
  return <svg className={small ? styles.small : styles.large} viewBox="0 0 134 24" role="img" aria-label={`${p.name} ClanSync 로고`}>
    <defs>
      <InkFilter id={id + "-knot"} low={p.front} high={p.back} channel={0} start={128} end={255} />
      <InkFilter id={id + "-type"} low={p.ink} high={p.join} channel={1} start={52} end={170} />
    </defs>
    <image href="/brand/clansync-symbol-dark.png" width="27.5" height="24" filter={`url(#${id}-knot)`} />
    <svg x="35" y="1" width="98" height="22" viewBox="83 229 1785 401">
      <image href="/brand/clansync-wordmark.png" width="1942" height="809" filter={`url(#${id}-type)`} />
    </svg>
  </svg>;
}

export default function LogoColorPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className={styles.page}>
    <header><p>ClanSync / Identity studies</p><h1>다크 모드 로고 배색</h1>
      <span>같은 매듭, 같은 글자. 아래 작은 로고는 게임 선택 헤더 크기입니다.</span></header>
    <div className={styles.grid}>{palettes.map((p, index) => <article key={p.name}>
      <h2><b>{String(index + 1).padStart(2, "0")}</b>{p.name}</h2>
      <div className={styles.stage}><Lockup index={index} /></div>
      <div className={styles.proof}><Lockup index={index} small />
        <div className={styles.swatches}>{[p.front, p.back, p.ink, p.join].map((color, i) =>
          <i key={i} style={{ background: color }} title={`${["매듭 앞면", "매듭 뒷면", "글자", "n–S 연결"][i]} ${color}`} />)}</div>
      </div>
    </article>)}</div>
  </main>;
}
