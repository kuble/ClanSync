"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClanBalanceSessionRealtime({
  sessionId,
  seriesId,
  clanId,
  roundKey,
}: {
  sessionId: string | null;
  seriesId: string | null;
  clanId: string;
  roundKey: string;
}) {
  const router = useRouter();
  const connectionKey = `${clanId}:${seriesId ?? "none"}:${sessionId ?? "none"}`;
  const [connection, setConnection] = useState({
    key: connectionKey,
    status: "CONNECTING",
  });
  const status =
    connection.key === connectionKey ? connection.status : "CONNECTING";
  const roundKeyRef = useRef(roundKey);
  useEffect(() => {
    roundKeyRef.current = roundKey;
  }, [roundKey]);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (disposed) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 120);
    };
    const channel = supabase
      .channel(`balance_session:${sessionId ?? clanId}`)
      .on("system", {}, (payload) => {
        // The socket joins before the database listener is ready. Catch up on
        // changes in that gap, including when an existing connection rejoins.
        if (
          payload.extension === "postgres_changes" &&
          payload.status === "ok"
        ) {
          if (!disposed) setConnection({ key: connectionKey, status: "READY" });
          refresh();
        }
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balance_sessions",
          filter: seriesId ? `series_id=eq.${seriesId}` : `clan_id=eq.${clanId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balance_session_series",
          filter: seriesId ? `id=eq.${seriesId}` : `clan_id=eq.${clanId}`,
        },
        refresh,
      )
      .on("postgres_changes", {
        event: "*", schema: "public", table: "balance_rooms",
        filter: seriesId ? `series_id=eq.${seriesId}` : `clan_id=eq.${clanId}`,
      }, refresh);

    if (sessionId) {
      for (const table of [
        "balance_session_map_votes",
        "balance_session_hero_votes",
        "balance_session_predictions",
      ]) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `session_id=eq.${sessionId}`,
          },
          refresh,
        );
      }
    }
    // A server-action login writes cookies; synchronize the realtime token before
    // joining so a browser singleton cannot retain an earlier anonymous session.
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (disposed) return;
        if (data.session)
          await supabase.realtime.setAuth(data.session.access_token);
        if (disposed) return;
        channel.subscribe((nextStatus) => {
          if (!disposed)
            setConnection((current) => ({
              key: connectionKey,
              status:
                nextStatus === "SUBSCRIBED" &&
                current.key === connectionKey &&
                current.status === "READY"
                  ? "READY"
                  : nextStatus,
            }));
        });
      })
      .catch(() => {
        if (!disposed)
          setConnection({ key: connectionKey, status: "CHANNEL_ERROR" });
      });

    // A socket can report SUBSCRIBED while WAL delivery is delayed. Compare a
    // small public revision snapshot; only a change causes a full page refresh.
    let checking = false;
    const checkRevision = async () => {
      if (disposed || checking || document.visibilityState !== "visible")
        return;
      checking = true;
      try {
        if (!seriesId) return;
        const { data, error } = await supabase
          .from("balance_sessions")
          .select("id,formation_revision,phase,match_outcome")
          .eq("clan_id", clanId)
          .eq("series_id", seriesId)
          .is("closed_at", null)
          .maybeSingle();
        if (error || disposed) return;
        const key = data
          ? `${data.id}:${data.formation_revision}:${data.phase}:${data.match_outcome}`
          : "none";
        if (key !== roundKeyRef.current) refresh();
      } catch {
        /* A later revision check retries transient network failures. */
      } finally {
        checking = false;
      }
    };
    const revisionTimer = window.setInterval(
      () => {
        void checkRevision();
      },
      sessionId ? 2000 : 5000,
    );
    document.addEventListener("visibilitychange", checkRevision);
    // Also recover vote tallies, whose rows have independent revisions.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(revisionTimer);
      document.removeEventListener("visibilitychange", checkRevision);
      window.clearInterval(timer);
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, seriesId, clanId, connectionKey, router]);

  return (
    <span
      className="sr-only"
      data-testid="balance-realtime"
      data-connection-status={status}
    >
      {status === "CHANNEL_ERROR" || status === "TIMED_OUT"
        ? "실시간 연결을 다시 확인하고 있습니다."
        : null}
    </span>
  );
}
