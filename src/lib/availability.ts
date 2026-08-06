import { DateTime } from "luxon";

import {
  intervalsOverlap,
  OFFICE_END_HOUR,
  OFFICE_START_HOUR,
  OFFICE_TIME_ZONE,
  SLOT_MINUTES,
} from "@/lib/booking-rules";
import type { AvailabilityOption, RoomDto } from "@/lib/types";

export const AVAILABILITY_HORIZON_DAYS = 14;
export const MAX_AVAILABILITY_ALTERNATIVES = 6;

type BusyInterval = {
  roomId: string;
  startAt: Date;
  endAt: Date;
};

export function rankAvailability({
  rooms,
  busyIntervals,
  desiredStart,
  durationMinutes,
  horizonDays = AVAILABILITY_HORIZON_DAYS,
  alternativeLimit = MAX_AVAILABILITY_ALTERNATIVES,
}: {
  rooms: RoomDto[];
  busyIntervals: BusyInterval[];
  desiredStart: Date;
  durationMinutes: number;
  horizonDays?: number;
  alternativeLimit?: number;
}) {
  const busyByRoom = new Map<string, BusyInterval[]>();
  for (const interval of busyIntervals) {
    const roomBusy = busyByRoom.get(interval.roomId) ?? [];
    roomBusy.push(interval);
    busyByRoom.set(interval.roomId, roomBusy);
  }

  const candidates = buildCandidateStarts(desiredStart, durationMinutes, horizonDays);
  const desiredCandidate = candidates[0];
  const exact = desiredCandidate
    ? rooms
        .filter((room) => roomIsAvailable(room.id, desiredCandidate, durationMinutes, busyByRoom))
        .map((room) => availabilityOption(room, desiredCandidate, durationMinutes))
    : [];

  if (exact.length > 0) return { exact, alternatives: [] };

  const alternatives: AvailabilityOption[] = [];
  for (const candidate of candidates.slice(1)) {
    for (const room of rooms) {
      if (roomIsAvailable(room.id, candidate, durationMinutes, busyByRoom)) {
        alternatives.push(availabilityOption(room, candidate, durationMinutes));
        if (alternatives.length >= alternativeLimit) return { exact, alternatives };
      }
    }
  }

  return { exact, alternatives };
}

function buildCandidateStarts(
  desiredStart: Date,
  durationMinutes: number,
  horizonDays: number,
) {
  const desiredOffice = DateTime.fromJSDate(desiredStart, { zone: "utc" }).setZone(
    OFFICE_TIME_ZONE,
  );
  const candidates: DateTime[] = [];
  const lastStartMinutes = OFFICE_END_HOUR * 60 - durationMinutes;

  for (let dayIndex = 0; dayIndex < horizonDays; dayIndex += 1) {
    const day = desiredOffice.plus({ days: dayIndex }).startOf("day");
    const firstStartMinutes =
      dayIndex === 0
        ? desiredOffice.hour * 60 + desiredOffice.minute
        : OFFICE_START_HOUR * 60;

    for (
      let minutes = firstStartMinutes;
      minutes <= lastStartMinutes;
      minutes += SLOT_MINUTES
    ) {
      candidates.push(
        day.set({
          hour: Math.floor(minutes / 60),
          minute: minutes % 60,
        }),
      );
    }
  }

  return candidates;
}

function roomIsAvailable(
  roomId: string,
  start: DateTime,
  durationMinutes: number,
  busyByRoom: Map<string, BusyInterval[]>,
) {
  const startAt = start.toUTC().toJSDate();
  const endAt = start.plus({ minutes: durationMinutes }).toUTC().toJSDate();
  return !(busyByRoom.get(roomId) ?? []).some((busy) =>
    intervalsOverlap(startAt, endAt, busy.startAt, busy.endAt),
  );
}

function availabilityOption(
  room: RoomDto,
  start: DateTime,
  durationMinutes: number,
): AvailabilityOption {
  const end = start.plus({ minutes: durationMinutes });
  return {
    room,
    officeDate: start.toISODate()!,
    startTime: start.toFormat("HH:mm"),
    endTime: end.toFormat("HH:mm"),
    startAt: start.toUTC().toISO()!,
    endAt: end.toUTC().toISO()!,
  };
}
