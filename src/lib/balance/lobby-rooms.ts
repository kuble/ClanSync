type Room = {
  id: string; kind: "regular" | "flash"; status: string;
  schedule_id: string | null; scheduled_at: string;
};

// A recurring reservation and its open session share one lobby entry.
export function activeLobbyRooms<T extends Room>(rooms: readonly T[]): T[] {
  const entries = new Map<string, T>();
  for (const room of rooms) {
    if (room.status !== "open" && room.status !== "scheduled") continue;
    // Every open occurrence remains reachable. Only collapse future reservations.
    if (room.status === "scheduled" && room.schedule_id && rooms.some((other) =>
      other.schedule_id === room.schedule_id && other.status === "open")) continue;
    const key = room.kind === "regular" && room.schedule_id && room.status === "scheduled" ? room.schedule_id : room.id;
    const current = entries.get(key);
    if (!current || (room.status === "open" && current.status !== "open") ||
      (room.status === current.status && room.scheduled_at < current.scheduled_at)) entries.set(key, room);
  }
  return [...entries.values()].sort((a, b) =>
    Number(b.kind === "regular") - Number(a.kind === "regular") || a.scheduled_at.localeCompare(b.scheduled_at));
}
