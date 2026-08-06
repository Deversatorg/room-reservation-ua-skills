import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { rankAvailability } from "@/lib/availability";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";

const rooms = [
  { id: "small", name: "Small", floor: 1, capacity: 4 },
  { id: "large", name: "Large", floor: 2, capacity: 10 },
];

function instant(dateTime: string) {
  return DateTime.fromISO(dateTime, { zone: OFFICE_TIME_ZONE }).toUTC().toJSDate();
}

describe("availability ranking", () => {
  it("returns every matching room for the requested interval", () => {
    const result = rankAvailability({
      rooms,
      busyIntervals: [],
      desiredStart: instant("2026-08-10T10:00"),
      durationMinutes: 60,
    });

    expect(result.exact.map((option) => option.room.id)).toEqual(["small", "large"]);
    expect(result.alternatives).toEqual([]);
  });

  it("removes only rooms whose active intervals overlap", () => {
    const result = rankAvailability({
      rooms,
      busyIntervals: [
        {
          roomId: "small",
          startAt: instant("2026-08-10T09:30"),
          endAt: instant("2026-08-10T10:30"),
        },
      ],
      desiredStart: instant("2026-08-10T10:00"),
      durationMinutes: 60,
    });

    expect(result.exact.map((option) => option.room.id)).toEqual(["large"]);
  });

  it("suggests the closest later room when the exact time is full", () => {
    const result = rankAvailability({
      rooms,
      busyIntervals: [
        {
          roomId: "small",
          startAt: instant("2026-08-10T10:00"),
          endAt: instant("2026-08-10T11:00"),
        },
        {
          roomId: "large",
          startAt: instant("2026-08-10T10:00"),
          endAt: instant("2026-08-10T10:30"),
        },
      ],
      desiredStart: instant("2026-08-10T10:00"),
      durationMinutes: 60,
    });

    expect(result.exact).toEqual([]);
    expect(result.alternatives[0]).toMatchObject({
      room: { id: "large" },
      officeDate: "2026-08-10",
      startTime: "10:30",
      endTime: "11:30",
    });
  });

  it("treats adjacent half-open intervals as available", () => {
    const result = rankAvailability({
      rooms: [rooms[0]],
      busyIntervals: [
        {
          roomId: "small",
          startAt: instant("2026-08-10T09:00"),
          endAt: instant("2026-08-10T10:00"),
        },
      ],
      desiredStart: instant("2026-08-10T10:00"),
      durationMinutes: 30,
    });

    expect(result.exact).toHaveLength(1);
  });
});
