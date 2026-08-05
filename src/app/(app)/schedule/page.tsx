import { DateTime } from "luxon";

import { ScheduleClient } from "@/components/schedule-client";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; week?: string; day?: string; capacity?: string }>;
}) {
  await requirePageUser();
  const [rooms, query] = await Promise.all([
    db.room.findMany({
      orderBy: [{ floor: "asc" }, { name: "asc" }],
      select: { id: true, name: true, floor: true, capacity: true },
    }),
    searchParams,
  ]);

  const parsedCapacity = Number(query.capacity);
  const initialMinCapacity =
    Number.isInteger(parsedCapacity) && parsedCapacity >= 1 && parsedCapacity <= 100
      ? parsedCapacity
      : 0;
  const availableRooms = rooms.filter((room) => room.capacity >= initialMinCapacity);
  const requestedRoom = availableRooms.find((room) => room.id === query.room)?.id;
  const requestedWeek = DateTime.fromISO(query.week ?? "", { zone: OFFICE_TIME_ZONE });
  const initialWeek = requestedWeek.isValid
    ? requestedWeek.startOf("week").toISODate()!
    : DateTime.now().setZone(OFFICE_TIME_ZONE).startOf("week").toISODate()!;
  const requestedDay = DateTime.fromISO(query.day ?? "", { zone: OFFICE_TIME_ZONE });
  const today = DateTime.now().setZone(OFFICE_TIME_ZONE).startOf("day");
  const initialDay = requestedDay.isValid
    ? requestedDay.toISODate()!
    : today.startOf("week").toISODate() === initialWeek
      ? today.toISODate()!
      : initialWeek;
  return (
    <ScheduleClient
      rooms={rooms}
      initialRoomId={requestedRoom ?? availableRooms[0]?.id ?? ""}
      initialWeek={initialWeek}
      initialDay={initialDay}
      initialMinCapacity={initialMinCapacity}
    />
  );
}
