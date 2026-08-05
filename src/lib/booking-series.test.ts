import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { buildWeeklyOccurrences } from "@/lib/booking-series";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";

describe("weekly booking occurrences", () => {
  it("keeps the same Kyiv wall-clock time across the DST boundary", () => {
    const start = DateTime.fromISO("2026-10-18T10:00", { zone: OFFICE_TIME_ZONE });
    const end = start.plus({ hours: 1 });
    const occurrences = buildWeeklyOccurrences(
      start.toUTC().toJSDate(),
      end.toUTC().toJSDate(),
      3,
    );

    expect(
      occurrences.map((occurrence) =>
        DateTime.fromJSDate(occurrence.startAt, { zone: "utc" })
          .setZone(OFFICE_TIME_ZONE)
          .toFormat("yyyy-LL-dd HH:mm ZZZ"),
      ),
    ).toEqual([
      "2026-10-18 10:00 +0300",
      "2026-10-25 10:00 +0200",
      "2026-11-01 10:00 +0200",
    ]);
  });

  it("rejects counts outside the bounded series size", () => {
    const start = new Date("2026-08-10T07:00:00.000Z");
    const end = new Date("2026-08-10T08:00:00.000Z");

    expect(() => buildWeeklyOccurrences(start, end, 1)).toThrow(RangeError);
    expect(() => buildWeeklyOccurrences(start, end, 13)).toThrow(RangeError);
  });
});
