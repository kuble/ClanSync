import "server-only";

import { cache } from "react";

export interface ClanMemberListRow {
  userId: string;
  displayName: string;
  gameUid: string;
  role: string;
  status: string;
  joinedAt: string | null;
}

/** 클랜 관리 화면용 멤버·가입 대기 목록 — 목업 전용 (Supabase 연동 시 교체). */
export const loadClanMembersForManage = cache(
  async (
    _clanId: string,
  ): Promise<{ pending: ClanMemberListRow[]; active: ClanMemberListRow[] }> => {
    void _clanId;
    return {
      pending: [
        {
          userId: "mock-p1",
          displayName: "신청자A",
          gameUid: "Player#0001",
          role: "member",
          status: "pending",
          joinedAt: null,
        },
        {
          userId: "mock-p2",
          displayName: "신청자B",
          gameUid: "Rookie#7777",
          role: "member",
          status: "pending",
          joinedAt: null,
        },
      ],
      active: [
        {
          userId: "mock-1",
          displayName: "클랜장",
          gameUid: "Leader#1000",
          role: "leader",
          status: "active",
          joinedAt: "2025-01-15T00:00:00.000Z",
        },
        {
          userId: "mock-2",
          displayName: "운영진",
          gameUid: "Officer#2000",
          role: "officer",
          status: "active",
          joinedAt: "2025-02-01T00:00:00.000Z",
        },
        {
          userId: "mock-3",
          displayName: "멤버",
          gameUid: "Member#3000",
          role: "member",
          status: "active",
          joinedAt: "2025-06-10T00:00:00.000Z",
        },
      ],
    };
  },
);
