import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginPage } from "../helpers/test-data";

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test("auth pages have no serious or critical Axe violations", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to Roomly" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("schedule and My bookings have no serious or critical Axe violations", async ({
  page,
}) => {
  await loginPage(page);
  await expect(page.getByRole("heading", { name: "Meeting room schedule" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page.getByRole("link", { name: "My bookings" }).click();
  await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
  await expect(page.locator("section[aria-busy=false]")).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});
