import { describe, expect, it } from "vitest";

import {
  getLocalOfficeDayPresentation,
  localSlotDateTimeLabel,
  localSlotTimeLabel,
} from "@/lib/calendar-time";

describe("calendar timezone presentation", () => {
  it("shifts Kyiv office slots into a nearby browser timezone", () => {
    expect(localSlotTimeLabel("2026-08-17", "09:00", "Europe/Warsaw")).toBe(
      "08:00",
    );
    expect(
      getLocalOfficeDayPresentation("2026-08-17", "Europe/Warsaw"),
    ).toMatchObject({
      crossesDate: false,
      headerWeekday: "Mon",
      headerDate: "17",
      localWindow: "08:00–18:00",
    });
  });

  it("labels a Kyiv office day that starts on the previous date in Los Angeles", () => {
    expect(
      getLocalOfficeDayPresentation("2026-08-17", "America/Los_Angeles"),
    ).toMatchObject({
      crossesDate: true,
      headerWeekday: "Sun → Mon",
      headerDate: "Aug 16 → Aug 17",
      localWindow: "23:00–09:00",
    });
    expect(
      localSlotDateTimeLabel(
        "2026-08-17",
        "09:00",
        "America/Los_Angeles",
      ),
    ).toBe("Sunday, August 16 · 23:00");
  });

  it("labels a Kyiv office day that ends on the next date in Tokyo", () => {
    expect(
      getLocalOfficeDayPresentation("2026-08-17", "Asia/Tokyo"),
    ).toMatchObject({
      crossesDate: true,
      headerWeekday: "Mon → Tue",
      headerDate: "Aug 17 → Aug 18",
      localWindow: "15:00–01:00",
    });
    expect(
      localSlotDateTimeLabel("2026-08-17", "18:30", "Asia/Tokyo"),
    ).toBe("Tuesday, August 18 · 00:30");
  });

  it("uses real zone rules instead of a fixed offset across DST changes", () => {
    expect(
      localSlotTimeLabel("2026-10-18", "09:00", "America/New_York"),
    ).toBe("02:00");
    expect(
      localSlotTimeLabel("2026-10-25", "09:00", "America/New_York"),
    ).toBe("03:00");
  });
});
