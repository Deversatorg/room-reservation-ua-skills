import { expect, test } from "@playwright/test";
import { DateTime } from "luxon";

import {
  futureOfficeSlot,
  loginPage,
  OFFICE_TIME_ZONE,
} from "../helpers/test-data";

const scenarios = [
  {
    name: "Los Angeles previous-day boundary",
    timezoneId: "America/Los_Angeles",
    officeHour: 9,
    officeMinute: 0,
    viewport: { width: 1440, height: 900 },
  },
  {
    name: "Tokyo next-day boundary on mobile",
    timezoneId: "Asia/Tokyo",
    officeHour: 18,
    officeMinute: 30,
    viewport: { width: 390, height: 844 },
  },
] as const;

for (const scenario of scenarios) {
  test(`shows unambiguous local dates for the ${scenario.name}`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      timezoneId: scenario.timezoneId,
      viewport: scenario.viewport,
    });
    const page = await context.newPage();

    try {
      await loginPage(page);
      const slot = futureOfficeSlot({
        weeks: 14,
        weekday: 1,
        hour: scenario.officeHour,
        minute: scenario.officeMinute,
      });
      const officeWeek = DateTime.fromISO(slot.officeDate, {
        zone: OFFICE_TIME_ZONE,
      })
        .startOf("week")
        .toISODate()!;
      const localStart = DateTime.fromISO(
        `${slot.officeDate}T${String(scenario.officeHour).padStart(2, "0")}:${String(scenario.officeMinute).padStart(2, "0")}`,
        { zone: OFFICE_TIME_ZONE },
      ).setZone(scenario.timezoneId);

      await page.goto(
        `/schedule?week=${officeWeek}&day=${slot.officeDate}`,
      );
      await expect(page.getByText(scenario.timezoneId, { exact: true })).toBeVisible();

      const localSlotName = `Book ${localStart.toFormat("HH:mm")} on ${localStart.toFormat("cccc, LLLL d")}`;
      const slotButton = page.getByRole("button", { name: localSlotName }).first();
      await expect(slotButton).toBeVisible();
      await slotButton.click();

      await expect(page.getByRole("dialog", { name: "New booking" })).toBeVisible();
      await expect(page.getByLabel("Starts").locator("option:checked")).toHaveText(
        localStart.toFormat("cccc, LLLL d · HH:mm"),
      );
    } finally {
      await context.close();
    }
  });
}
