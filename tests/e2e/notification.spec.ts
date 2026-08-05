import { expect, test } from "@playwright/test";

import { createNotificationFixture } from "../helpers/notification-fixture";
import { loginPage } from "../helpers/test-data";

test("shows a handoff toast once and keeps the notification in the bell panel", async ({
  page,
}) => {
  const fixture = await createNotificationFixture();

  try {
    await loginPage(page);
    const toast = page.getByText("Your meeting ends soon", { exact: true });
    await expect(toast).toBeVisible();
    await expect(page.getByText(fixture.nextTitle, { exact: false })).toBeVisible();

    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByText(fixture.currentTitle, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Your meeting ends soon", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByText(fixture.currentTitle, { exact: true })).toBeVisible();
  } finally {
    await fixture.cleanup();
  }
});
