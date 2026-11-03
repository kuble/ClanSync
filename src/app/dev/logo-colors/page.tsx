import { notFound } from "next/navigation";
import styles from "./preview.module.css";

const palettes = [
  { name: "비취와 백자", front: "#62CBB3", back: "#357F79", ink: "#E5EBE7", join: "#83D3C1", file: "" },
  { name: "빙하 블루", front: "#95CAED", back: "#547AAC", ink: "#DAE5F1", join: "#91BCEC", file: "glacier-blue" },
  { name: "앰버와 먹색", front: "#EAB872", back: "#A67F57", ink: "#EFE6D7", join: "#E4B476", file: "amber-ink" },
  { name: "라일락과 청록", front: "#B4A6E2", back: "#78B5B4", ink: "#EAE7F1", join: "#B4A6E2", file: "lilac-teal" },
  { name: "구리와 장밋빛", front: "#DD9787", back: "#9B666C", ink: "#E9DBD7", join: "#E2A99A", file: "copper-rose" },
  { name: "실버 모노", front: "#CED4D3", back: "#84918F", ink: "#DCE0DF", join: "#A5B3B0", file: "silver-mono" },
] as const;

function Lockup({ index, small = false }: { index: number; small?: boolean }) {
  const p = palettes[index];
  return <svg className={small ? styles.small : styles.large} viewBox="0 0 134 24" role="img" aria-label={`${p.name} ClanSync 로고`}>
    {p.file ? <image href={`/brand/events/${p.file}.png`} width="134" height="24" /> : <>
      <image href="/brand/clansync-symbol-jade.png" width="27.5" height="24" />
      <image href="/brand/clansync-wordmark-porcelain.png" x="35" y="1" width="98" height="22" />
    </>}
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
