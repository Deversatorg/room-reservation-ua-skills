import { describe, expect, it } from "vitest";

import {
  isNotificationEligible,
  parseNotifyBeforeMinutes,
} from "@/lib/notification-rules";

describe("booking end notification rules", () => {
  const endAt = new Date("2026-08-05T12:00:00.000Z");
  const base = {
    currentEndAt: endAt,
    nextStartAt: endAt,
    currentCancelledAt: null,
    nextCancelledAt: null,
    notifyBeforeMinutes: 10,
  };

  it("opens at the configured boundary and closes at the meeting end", () => {
    expect(
      isNotificationEligible({ ...base, now: new Date("2026-08-05T11:50:00.000Z") }),
    ).toBe(true);
    expect(
      isNotificationEligible({ ...base, now: new Date("2026-08-05T12:00:00.000Z") }),
    ).toBe(false);
  });

  it("requires the immediately adjacent slot", () => {
    expect(
      isNotificationEligible({
        ...base,
        now: new Date("2026-08-05T11:55:00.000Z"),
        nextStartAt: new Date("2026-08-05T12:30:00.000Z"),
      }),
    ).toBe(false);
  });

  it("suppresses delivery when either booking is cancelled", () => {
    const now = new Date("2026-08-05T11:55:00.000Z");
    expect(isNotificationEligible({ ...base, now, currentCancelledAt: now })).toBe(false);
    expect(isNotificationEligible({ ...base, now, nextCancelledAt: now })).toBe(false);
  });

  it("uses a safe default for invalid env values", () => {
    expect(parseNotifyBeforeMinutes("15")).toBe(15);
    expect(parseNotifyBeforeMinutes("0")).toBe(10);
    expect(parseNotifyBeforeMinutes("not-a-number")).toBe(10);
  });
});
