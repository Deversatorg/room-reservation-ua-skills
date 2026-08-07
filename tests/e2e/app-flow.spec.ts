import { expect, test } from "@playwright/test";

import { futureOfficeSlot, loginPage } from "../helpers/test-data";

test("creates a recurring booking, opens it in the schedule, and cancels the series", async ({
  page,
}) => {
  await loginPage(page);
  await page.getByLabel("Minimum room capacity").selectOption("12");
  await expect(page).toHaveURL(/capacity=12/);
  await expect(page.getByRole("button", { name: /Atlas Floor 4 12/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Orbit Floor 4 16/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Aquarium Floor/ })).toHaveCount(0);

  const title = `E2E weekly ${Date.now()}`;
  const slot = futureOfficeSlot({ weeks: 12, weekday: 3, hour: 13 });
  await page.getByRole("button", { name: "New booking" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Office calendar date").fill(slot.officeDate);
  await page.getByLabel("Starts").selectOption("13:00");
  await page.getByLabel("Ends").selectOption("14:00");
  await page.getByLabel("Repeat weekly").check();
  await page.getByLabel("Number of occurrences").selectOption("3");
  await page.getByRole("button", { name: "Book room" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("link", { name: "My bookings" }).click();
  await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toHaveCount(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: `Open ${title} in schedule` }).first().click();
  await expect(page).toHaveURL(new RegExp(`day=${slot.officeDate}`));
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "My bookings" }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(3);

  await page.getByRole("button", { name: `Cancel ${title}` }).first().click();
  await expect(page.getByRole("dialog", { name: "Cancel booking?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel all future occurrences" }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});

test("uses a one-day, overflow-free calendar and bottom sheet at 390 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginPage(page);
  await page.getByLabel("Minimum room capacity").selectOption("12");

  await expect(page.getByRole("combobox", { name: /^Meeting room/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous day" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next day" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Book .* on/ })).toHaveCount(20);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await page.getByRole("button", { name: "New booking" }).click();
  const dialog = page.getByRole("dialog", { name: "New booking" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.y + box!.height - 844)).toBeLessThanOrEqual(2);
  await expect(page.getByLabel("Title")).toBeFocused();
  await dialog.getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Book room" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New booking" })).toBeFocused();
});

test("refreshes room search results and limits booking end times", async ({ page }) => {
  await loginPage(page);
  const slot = futureOfficeSlot({ weeks: 20, weekday: 2, hour: 9 });

  await page.getByRole("button", { name: "Find a room" }).click();
  await page.getByLabel("Office date").fill(slot.officeDate);
  await page.getByLabel("Starts").selectOption("09:00");
  await page.getByLabel("Duration").selectOption("60");
  const people = page.getByRole("spinbutton", { name: "People" });
  await people.fill("4");
  await page.getByRole("button", { name: "Find available rooms" }).click();
  await expect(page.getByRole("heading", { name: "6 rooms available at your time" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Book Aquarium/ })).toBeVisible();

  await people.fill("16");
  await expect(page.getByRole("heading", { name: /rooms available at your time/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Book Aquarium/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Find available rooms" }).click();
  await expect(page.getByRole("heading", { name: "1 room available at your time" })).toBeVisible();
  await page.getByRole("button", { name: /Book Orbit/ }).click();

  const bookingDialog = page.getByRole("dialog", { name: "New booking" });
  const room = bookingDialog.getByLabel("Meeting room");
  await expect(room.locator("option:checked")).toHaveText(/Orbit/);
  await bookingDialog.getByLabel("Starts").selectOption("13:00");
  const ends = bookingDialog.getByLabel("Ends");
  await expect(ends.locator('option[value="12:30"]')).toHaveCount(0);
  await expect(ends.locator('option[value="17:00"]')).toHaveCount(1);
  await expect(ends.locator('option[value="17:30"]')).toHaveCount(0);
});

test("canonicalizes mismatched week and day parameters", async ({ page }) => {
  await loginPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/schedule?week=2026-08-10&day=2026-09-30");

  await expect(page).toHaveURL(/week=2026-09-28/);
  await expect(page).toHaveURL(/day=2026-09-30/);
  await expect(
    page.getByText(/Wednesday, September 30 · Office timezone/),
  ).toBeVisible();
});
