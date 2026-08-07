import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  bookingEndTimeOptions,
  canCancelBooking,
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

describe("bookingEndTimeOptions", () => {
  it("offers only later times up to the four-hour limit", () => {
    expect(bookingEndTimeOptions("13:00")).toEqual([
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
    ]);
  });

  it("never offers an end after office hours", () => {
    expect(bookingEndTimeOptions("18:00")).toEqual(["18:30", "19:00"]);
  });
});

describe("canCancelBooking", () => {
  const now = at("2026-08-07T10:00:00Z");

  it("allows an owner to cancel a booking that has not ended", () => {
    expect(canCancelBooking("alex", "alex", at("2026-08-07T10:30:00Z"), now)).toBe(
      true,
    );
  });

  it("keeps past history immutable and rejects other users", () => {
    expect(canCancelBooking("alex", "alex", at("2026-08-07T10:00:00Z"), now)).toBe(
      false,
    );
    expect(canCancelBooking("alex", "maria", at("2026-08-07T10:30:00Z"), now)).toBe(
      false,
    );
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
