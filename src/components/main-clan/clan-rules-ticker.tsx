"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronRight, ScrollText } from "lucide-react";
import styles from "./clan-dashboard.module.css";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => false;

export function ClanRulesTicker({ rules, href, failed }: { rules: string | null; href: string; failed: boolean }) {
  const items = (rules ?? "").split(/\r?\n/).map(line => line.trim().replace(/^(?:\d+[.)]|[-*•])\s+/, "")).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotion);
  const active = items.length ? index % items.length : 0;
  const running = items.length > 1 && !hovered && !focused && !reducedMotion;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setIndex(previous => (previous + 1) % items.length), 8000);
    return () => window.clearInterval(timer);
  }, [running, items.length]);
  const text = items[active] ?? (failed ? "규칙을 불러오지 못했어요." : "등록된 규칙이 없습니다.");
  return <section aria-label="클랜 규칙" className={styles.rulesTicker}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={event => setFocused(event.target.matches(":focus-visible"))} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <Link href={href} className={styles.rulesLabel} aria-label="클랜 규칙"><ScrollText size={16} aria-hidden="true" /><span>클랜 규칙</span><ChevronRight size={12} aria-hidden="true" /></Link>
    <Link href={href} className={styles.ruleWindow} title={text} aria-label={`규칙 ${active + 1}: ${text}`}>
      <span key={active} data-rule-text className={styles.ruleFace}>{text}</span>
    </Link>
  </section>;
}
