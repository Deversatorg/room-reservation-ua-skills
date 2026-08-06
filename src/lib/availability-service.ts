import "server-only";

import { DateTime } from "luxon";

import {
  AVAILABILITY_HORIZON_DAYS,
  rankAvailability,
} from "@/lib/availability";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";
import { db } from "@/lib/db";

export async function findAvailableRooms({
  desiredStart,
  durationMinutes,
  minCapacity,
}: {
  desiredStart: Date;
  durationMinutes: number;
  minCapacity: number;
}) {
  const horizonEnd = DateTime.fromJSDate(desiredStart, { zone: "utc" })
    .setZone(OFFICE_TIME_ZONE)
    .startOf("day")
    .plus({ days: AVAILABILITY_HORIZON_DAYS })
    .toUTC()
    .toJSDate();

  const [rooms, busyIntervals] = await Promise.all([
    db.room.findMany({
      where: { capacity: { gte: minCapacity } },
      orderBy: [{ capacity: "asc" }, { floor: "asc" }, { name: "asc" }],
      select: { id: true, name: true, floor: true, capacity: true },
    }),
    db.booking.findMany({
      where: {
        cancelledAt: null,
        room: { capacity: { gte: minCapacity } },
        startAt: { lt: horizonEnd },
        endAt: { gt: desiredStart },
      },
      select: { roomId: true, startAt: true, endAt: true },
    }),
  ]);

  return rankAvailability({ rooms, busyIntervals, desiredStart, durationMinutes });
}
