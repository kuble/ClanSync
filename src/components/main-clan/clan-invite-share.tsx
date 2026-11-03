"use client";

import { useTranslator } from "#use-translator";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { getClanJoinInvite } from "@/app/actions/clan-invites";
import { Button } from "@/components/ui/button";
import { StatHelp } from "./stat-help";
import styles from "./clan-promotion-settings.module.css";

type Invite = { url: string; remainingMs: number; receivedAt: number };

export function ClanInviteShare({ gameSlug, clanId }: { gameSlug: string; clanId: string }) {
  const tx = useTranslator();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const qr = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true, fetching = false, nextAttempt = 0;
    let current: Invite | null = null;
    async function refresh() {
      if (fetching || performance.now() < nextAttempt) return;
      fetching = true;
      try {
        const result = await getClanJoinInvite(gameSlug, clanId);
        if (!active) return;
        if (!result.ok) throw new Error(result.error);
        current = { url: new URL(result.path, window.location.origin).href,
          remainingMs: Math.max(0, Date.parse(result.expiresAt) - Date.parse(result.serverNow)), receivedAt: performance.now() };
        setInvite(current); setRemaining(Math.ceil(current.remainingMs / 1000)); setError("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "초대를 불러오지 못했습니다.");
        nextAttempt = performance.now() + 15_000;
      } finally { fetching = false; }
    }
    void refresh();
    const timer = window.setInterval(() => {
      const seconds = current ? Math.max(0, Math.ceil((current.remainingMs - (performance.now() - current.receivedAt)) / 1000)) : 0;
      setRemaining(seconds);
      if (!seconds) void refresh();
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [gameSlug, clanId, retry]);

  const ready = !!invite && remaining > 0;
  async function copy() {
    if (!ready) return;
    try { await navigator.clipboard.writeText(invite.url); toast.success("초대 링크를 복사했습니다."); }
    catch { toast.error("링크 입력란의 주소를 선택해 복사해 주십시오."); }
  }
  function download() {
    const svg = qr.current?.querySelector("svg");
    if (!svg || !ready) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url; link.download = "clansync-invite.svg"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className={`${styles.panel} ${styles.invitePanel}`} aria-labelledby="invite-share-heading">
    <header className={styles.panelHeader}><span className={styles.sectionIcon}><QrCode size={20} aria-hidden /></span><h4 id="invite-share-heading" aria-label={tx("클랜 초대")}><StatHelp title={tx("클랜 초대")}>{tx("승인 대기 없이 클랜에 가입할 수 있습니다. QR코드는 30분 동안 유효하며, 만료 후 새 QR코드가 발급됩니다.")}</StatHelp></h4></header>
    <div className={styles.inviteBody}>
      <div ref={qr} className={styles.inviteQr}>
        {ready ? <QRCodeSVG value={invite.url} size={176} level="M" marginSize={4} role="img" aria-label={tx("승인 없이 클랜에 가입하는 초대 QR코드")} /> : <p className="text-center text-xs text-muted-foreground">{error ? tx("초대를 불러오지 못했습니다.") : tx("QR코드를 준비하고 있습니다.")}</p>}
      </div>
      <div className={styles.inviteDetails}>
        <p className="text-sm">{tx("초대 링크나 QR코드를 공유해 클랜원을 초대하세요.")}</p>
        <label className="sr-only" htmlFor="clan-invite-url">{tx("초대 링크")}</label>
        <input id="clan-invite-url" readOnly value={ready ? invite.url : ""} placeholder={tx("초대 링크를 준비하고 있습니다.")} className={styles.inviteUrl} onFocus={event => event.target.select()} />
        <div className={styles.inviteActions}>
          <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={copy}><Copy size={14} aria-hidden />{tx("링크 복사")}</Button>
          <Button type="button" variant="ghost" size="sm" disabled={!ready} onClick={download}><Download size={14} aria-hidden />{tx("QR 저장")}</Button>
          <span role="timer" className={`text-xs tabular-nums ${ready && remaining <= 180 ? "text-destructive" : "text-muted-foreground"}`}>{ready ? tx("남은 시간 {0}:{1}", String(Math.floor(remaining / 60)).padStart(2, "0"), String(remaining % 60).padStart(2, "0")) : tx("갱신 중")}</span>
        </div>
        {error && <div role="alert" className="text-xs text-destructive">{tx(error)} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>{tx("다시 시도")}</button></div>}
      </div>
    </div>
  </section>;
}
