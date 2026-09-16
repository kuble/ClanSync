import { notFound, redirect } from "next/navigation";
import { ClanBalanceLobby, type LobbyRoom } from "@/components/main-clan/clan-balance-lobby";
import { ClanBalanceRoomData } from "@/components/main-clan/clan-balance-room-data";
import { getRequestMainClanContext } from "@/lib/clan/load-main-clan-context";
import { getRequestClient, getRequestUser } from "@/lib/supabase/request";

export default async function BalancePage({ params, searchParams }: {
  params: Promise<{ gameSlug: string; clanId: string }>;
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const [{ gameSlug, clanId }, query, client, user] = await Promise.all([
    params, searchParams, getRequestClient(), getRequestUser(),
  ]);
  if (!user) return null;
  const ctx = await getRequestMainClanContext(gameSlug, clanId);
  if (!ctx) return null;
  if (query.room) {
    if (typeof query.room !== "string" || !/^[0-9a-f-]{36}$/i.test(query.room)) notFound();
    const { data: room, error } = await client.from("balance_rooms").select("*")
      .eq("id", query.room).eq("clan_id", clanId).maybeSingle();
    if (error) throw new Error("내전 정보를 불러오지 못했습니다.");
    if (!room) notFound();
    if (room.status !== "open" || !room.series_id) redirect(`/games/${gameSlug}/clan/${clanId}/balance`);
    return <ClanBalanceRoomData gameSlug={gameSlug} clanId={clanId} room={room} />;
  }
  const [roomResult, memberResult, scheduleResult, poolResult] = await Promise.all([
    client.from("balance_rooms").select("*").eq("clan_id", clanId).order("created_at", { ascending: false }).limit(100),
    client.from("clan_members").select("user_id,role").eq("clan_id", clanId).eq("status", "active"),
    client.from("balance_room_schedules").select("id,interval_days,enabled").eq("clan_id", clanId),
    client.rpc("list_balance_roster_pool", { p_clan_id: clanId }),
  ]);
  if (roomResult.error || memberResult.error || scheduleResult.error || poolResult.error) throw new Error("내전 목록을 불러오지 못했습니다.");
  const rooms = roomResult.data ?? [];
  const members = (memberResult.data ?? []).map((member) => ({
    user_id: member.user_id, role: member.role,
    nickname: poolResult.data?.find((person: { user_id: string; nickname: string }) => person.user_id === member.user_id)?.nickname ?? "클랜원",
  }));
  const seriesIds = rooms.flatMap((room) => room.series_id ? [room.series_id] : []);
  const [responseResult, roundResult] = await Promise.all([
    rooms.length ? client.from("balance_room_rsvps").select("room_id,user_id,response").in("room_id", rooms.map((room) => room.id)) : Promise.resolve({ data: [], error: null }),
    seriesIds.length ? client.from("balance_sessions").select("series_id,round_number").in("series_id", seriesIds).order("round_number", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (responseResult.error || roundResult.error) throw new Error("내전 현황을 불러오지 못했습니다.");
  const lobbyRooms: LobbyRoom[] = rooms.map((room) => {
    const responses = (responseResult.data ?? []).filter((row) => row.room_id === room.id);
    const schedule = scheduleResult.data?.find((row) => row.id === room.schedule_id);
    return {
      ...room,
      kind: room.kind as LobbyRoom["kind"], status: room.status as LobbyRoom["status"],
      creatorNickname: members.find((member) => member.user_id === room.created_by)?.nickname ?? "이전 클랜원",
      delegateNickname: members.find((member) => member.user_id === room.delegated_to)?.nickname ?? null,
      rsvpCounts: { going: responses.filter((row) => row.response === "going").length, maybe: responses.filter((row) => row.response === "maybe").length, no: responses.filter((row) => row.response === "no").length },
      myRsvp: (responses.find((row) => row.user_id === user.id)?.response ?? null) as LobbyRoom["myRsvp"],
      roundNumber: roundResult.data?.find((round) => round.series_id === room.series_id)?.round_number ?? null,
      repeatEveryDays: schedule?.interval_days ?? null, scheduleEnabled: schedule?.enabled ?? false,
    };
  });
  // The server clock keeps RSVP windows consistent across browser time zones.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <ClanBalanceLobby gameSlug={gameSlug} clanId={clanId} userId={user.id} clanRole={ctx.role} rooms={lobbyRooms} members={members} serverNow={serverNow} />;
}
