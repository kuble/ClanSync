"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * balance_sessions 행 갱신 시 서버 컴포넌트 재조회.
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
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  return null;
}
