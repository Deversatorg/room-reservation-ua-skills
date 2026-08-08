import { expect, test } from "@playwright/test";

import { DEMO_PASSWORD } from "../helpers/test-data";

test("uses Ukrainian by default and persists an English language choice", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  await context.clearCookies();
  const page = await context.newPage();

  try {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(
      page.getByRole("heading", { name: "Увійдіть у Roomly" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Перемкнути англійською" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { name: "Sign in to Roomly" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Sign in to Roomly" }),
    ).toBeVisible();

    await page.getByLabel("Work email").fill("alex@room.test");
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/schedule/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Meeting room schedule" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Switch to Ukrainian" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(
      page.getByRole("heading", { name: "Розклад переговорних кімнат" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
