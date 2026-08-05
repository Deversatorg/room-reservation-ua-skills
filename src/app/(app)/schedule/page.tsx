import { DateTime } from "luxon";

import { ScheduleClient } from "@/components/schedule-client";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; week?: string }>;
}) {
  await requirePageUser();
  const [rooms, query] = await Promise.all([
    db.room.findMany({
      orderBy: [{ floor: "asc" }, { name: "asc" }],
      select: { id: true, name: true, floor: true, capacity: true },
    }),
    searchParams,
  ]);

  const requestedRoom = rooms.find((room) => room.id === query.room)?.id;
  const requestedWeek = DateTime.fromISO(query.week ?? "", { zone: OFFICE_TIME_ZONE });
  const initialWeek = requestedWeek.isValid
    ? requestedWeek.startOf("week").toISODate()!
    : DateTime.now().setZone(OFFICE_TIME_ZONE).startOf("week").toISODate()!;

  return (
    <ScheduleClient
      rooms={rooms}
      initialRoomId={requestedRoom ?? rooms[0]?.id ?? ""}
      initialWeek={initialWeek}
    />
  );
}
