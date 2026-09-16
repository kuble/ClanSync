"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClanBalanceSessionRealtime({
  sessionId,
  clanId,
}: {
  sessionId: string | null;
  clanId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => router.refresh();
    const channel = supabase
      .channel(`balance_session:${sessionId ?? clanId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balance_sessions",
          filter: `clan_id=eq.${clanId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balance_session_series",
          filter: `clan_id=eq.${clanId}`,
        },
        refresh,
      );

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
    channel.subscribe();

    // Recover the visible screen when a realtime connection is unavailable.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, clanId, router]);

  return null;
}
