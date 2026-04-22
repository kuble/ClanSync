"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * balance_sessions·맵/영웅 투표 변경 시 서버 컴포넌트 재조회.
 * Realtime 미설정/비활성 시에도 구독만 실패할 뿐 앱은 동작한다.
 */
export function ClanBalanceSessionRealtime({
  sessionId,
}: {
  sessionId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      router.refresh();
    };

    const channel = supabase
      .channel(`balance_session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "balance_sessions",
          filter: `id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balance_session_map_votes",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "balance_session_hero_votes",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  return null;
}
