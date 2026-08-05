import { DateTime } from "luxon";

import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";

export type BookingOccurrence = {
  index: number;
  startAt: Date;
  endAt: Date;
};

export function buildWeeklyOccurrences(startAt: Date, endAt: Date, count: number) {
  if (!Number.isInteger(count) || count < 2 || count > 12) {
    throw new RangeError("A weekly series must contain between 2 and 12 occurrences.");
  }

  const localStart = DateTime.fromJSDate(startAt, { zone: "utc" }).setZone(
    OFFICE_TIME_ZONE,
  );
  const localEnd = DateTime.fromJSDate(endAt, { zone: "utc" }).setZone(OFFICE_TIME_ZONE);

  return Array.from({ length: count }, (_, index): BookingOccurrence => ({
    index,
    startAt: localStart.plus({ weeks: index }).toUTC().toJSDate(),
    endAt: localEnd.plus({ weeks: index }).toUTC().toJSDate(),
  }));
}
