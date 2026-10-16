"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Database events refresh the lobby; a slower poll recovers missed events. */
export function BalanceLobbyRealtime({ clanId, roomIds }: { clanId: string; roomIds: readonly string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refreshing = useRef(false);
  const queued = useRef(false);
  const roomFilter = roomIds.slice(0, 100).join(",");

  useEffect(() => {
    refreshing.current = pending;
    if (!pending && queued.current) {
      queued.current = false;
      if (!document.hidden && navigator.onLine) {
        refreshing.current = true;
        start(() => router.refresh());
      }
    }
  }, [pending, router]);

  useEffect(() => {
    const client = createClient();
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (disposed || document.hidden || !navigator.onLine) return;
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (disposed || document.hidden || !navigator.onLine) return;
        if (refreshing.current) { queued.current = true; return; }
        refreshing.current = true;
        start(() => router.refresh());
      }, 120);
    };
    const channel = client.channel(`balance_lobby:${clanId}`);
    for (const table of ["balance_rooms", "balance_room_schedules"]) for (const event of ["INSERT", "UPDATE"] as const) {
      channel.on("postgres_changes", {
        event, schema: "public", table, filter: `clan_id=eq.${clanId}`,
      }, refresh);
    }
    // Subscribe only to displayed rooms, still under their existing SELECT RLS.
    // Deletes use the fallback because Realtime cannot apply their SELECT RLS.
    if (roomFilter) for (const event of ["INSERT", "UPDATE"] as const) {
      channel.on("postgres_changes", {
        event, schema: "public", table: "balance_room_rsvps",
        filter: `room_id=in.(${roomFilter})`,
      }, refresh);
    }
    channel.on("system", {}, (event) => {
      if (event.extension === "postgres_changes" && event.status === "ok") refresh();
    });
    void client.auth.getSession().then(async ({ data }) => {
      if (disposed) return;
      if (data.session) await client.realtime.setAuth(data.session.access_token);
      if (!disposed) channel.subscribe();
    }).catch(() => { /* The fallback also covers a failed socket connection. */ });

    const fallback = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      disposed = true;
      queued.current = false;
      clearTimeout(timer);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      void client.removeChannel(channel);
    };
  }, [clanId, roomFilter, router]);

  return null;
}
