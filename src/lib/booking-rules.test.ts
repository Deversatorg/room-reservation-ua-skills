import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  intervalsOverlap,
  OFFICE_TIME_ZONE,
  validateBookingWindow,
} from "@/lib/booking-rules";

function at(iso: string) {
  return new Date(iso);
}

describe("intervalsOverlap", () => {
  it("allows intervals that touch at an edge", () => {
    expect(
      intervalsOverlap(
        at("2026-08-06T07:00:00Z"),
        at("2026-08-06T08:00:00Z"),
        at("2026-08-06T08:00:00Z"),
        at("2026-08-06T09:00:00Z"),
      ),
    ).toBe(false);
  });

  it("detects a partial overlap", () => {
    expect(
      intervalsOverlap(
        at("2026-08-06T07:00:00Z"),
        at("2026-08-06T09:00:00Z"),
        at("2026-08-06T08:30:00Z"),
        at("2026-08-06T10:00:00Z"),
      ),
    ).toBe(true);
  });

  it("detects a complete match", () => {
    expect(
      intervalsOverlap(
        at("2026-08-06T07:00:00Z"),
        at("2026-08-06T08:00:00Z"),
        at("2026-08-06T07:00:00Z"),
        at("2026-08-06T08:00:00Z"),
      ),
    ).toBe(true);
  });

  it("does not overlap intervals on adjacent days", () => {
    expect(
      intervalsOverlap(
        at("2026-08-06T07:00:00Z"),
        at("2026-08-06T08:00:00Z"),
        at("2026-08-07T07:00:00Z"),
        at("2026-08-07T08:00:00Z"),
      ),
    ).toBe(false);
  });
});

describe("validateBookingWindow", () => {
  const futureKyiv = DateTime.fromISO("2026-08-10T10:00", {
    zone: OFFICE_TIME_ZONE,
  });
  const now = DateTime.fromISO("2026-08-09T10:00", {
    zone: OFFICE_TIME_ZONE,
  }).toJSDate();

  it("accepts a future booking inside office hours", () => {
    expect(
      validateBookingWindow(
        futureKyiv.toUTC().toJSDate(),
        futureKyiv.plus({ hours: 1 }).toUTC().toJSDate(),
        now,
      ),
    ).toBeNull();
  });

  it("rejects a past start", () => {
    expect(
      validateBookingWindow(
        DateTime.fromISO("2026-08-08T10:00", { zone: OFFICE_TIME_ZONE })
          .toUTC()
          .toJSDate(),
        DateTime.fromISO("2026-08-08T11:00", { zone: OFFICE_TIME_ZONE })
          .toUTC()
          .toJSDate(),
        now,
      )?.code,
    ).toBe("PAST_TIME");
  });

  it("rejects a booking outside Kyiv office hours", () => {
    expect(
      validateBookingWindow(
        DateTime.fromISO("2026-08-10T08:30", { zone: OFFICE_TIME_ZONE })
          .toUTC()
          .toJSDate(),
        DateTime.fromISO("2026-08-10T09:30", { zone: OFFICE_TIME_ZONE })
          .toUTC()
          .toJSDate(),
        now,
      )?.code,
    ).toBe("OUTSIDE_WORKING_HOURS");
  });

  it("rejects a duration longer than four hours", () => {
    expect(
      validateBookingWindow(
        futureKyiv.toUTC().toJSDate(),
        futureKyiv.plus({ hours: 4, minutes: 30 }).toUTC().toJSDate(),
        now,
      )?.code,
    ).toBe("INVALID_DURATION");
  });
});
