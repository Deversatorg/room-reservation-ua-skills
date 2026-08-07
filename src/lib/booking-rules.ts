import { DateTime } from "luxon";

export const OFFICE_TIME_ZONE = "Europe/Kyiv";
export const OFFICE_START_HOUR = 9;
export const OFFICE_END_HOUR = 19;
export const SLOT_MINUTES = 30;
export const MAX_BOOKING_MINUTES = 240;

export type BookingRuleCode =
  | "PAST_TIME"
  | "INVALID_TIME_STEP"
  | "INVALID_DURATION"
  | "OUTSIDE_WORKING_HOURS";

export type BookingRuleViolation = {
  code: BookingRuleCode;
  message: string;
  field: "startAt" | "endAt";
};

export function intervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function bookingEndTimeOptions(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const latestEndMinutes = Math.min(
    OFFICE_END_HOUR * 60,
    startMinutes + MAX_BOOKING_MINUTES,
  );

  return Array.from(
    { length: Math.max(0, (latestEndMinutes - startMinutes) / SLOT_MINUTES) },
    (_, index) => {
      const endMinutes = startMinutes + (index + 1) * SLOT_MINUTES;
      return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(
        endMinutes % 60,
      ).padStart(2, "0")}`;
    },
  );
}

export function canCancelBooking(
  bookingUserId: string,
  currentUserId: string,
  endAt: Date,
  now = new Date(),
) {
  return bookingUserId === currentUserId && endAt > now;
}

export function validateBookingWindow(
  startAt: Date,
  endAt: Date,
  now = new Date(),
): BookingRuleViolation | null {
  const start = DateTime.fromJSDate(startAt, { zone: "utc" }).setZone(OFFICE_TIME_ZONE);
  const end = DateTime.fromJSDate(endAt, { zone: "utc" }).setZone(OFFICE_TIME_ZONE);

  if (startAt <= now) {
    return {
      code: "PAST_TIME",
      field: "startAt",
      message: "The booking must start in the future.",
    };
  }

  const isStartAligned =
    start.minute % SLOT_MINUTES === 0 && start.second === 0 && start.millisecond === 0;
  const isEndAligned =
    end.minute % SLOT_MINUTES === 0 && end.second === 0 && end.millisecond === 0;

  if (!isStartAligned || !isEndAligned) {
    return {
      code: "INVALID_TIME_STEP",
      field: !isStartAligned ? "startAt" : "endAt",
      message: "Start and end times must use 30-minute steps.",
    };
  }

  const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
  if (
    durationMinutes < SLOT_MINUTES ||
    durationMinutes > MAX_BOOKING_MINUTES ||
    durationMinutes % SLOT_MINUTES !== 0
  ) {
    return {
      code: "INVALID_DURATION",
      field: "endAt",
      message: "A booking must last between 30 minutes and 4 hours.",
    };
  }

  const sameOfficeDay = start.toISODate() === end.toISODate();
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const workingStart = OFFICE_START_HOUR * 60;
  const workingEnd = OFFICE_END_HOUR * 60;

  if (
    !sameOfficeDay ||
    startMinutes < workingStart ||
    endMinutes > workingEnd ||
    endMinutes <= workingStart
  ) {
    return {
      code: "OUTSIDE_WORKING_HOURS",
      field: "startAt",
      message: "Bookings must stay within 09:00–19:00 Europe/Kyiv.",
    };
  }

  return null;
}

export function officeDateTimeToUtc(date: string, time: string) {
  return DateTime.fromISO(`${date}T${time}`, { zone: OFFICE_TIME_ZONE }).toUTC();
}
