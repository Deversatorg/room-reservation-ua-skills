import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { DateTime } from "luxon";

export const DEMO_PASSWORD = "DemoPass123!";
export const OFFICE_TIME_ZONE = "Europe/Kyiv";

export function localeStorageState(baseURL: string, locale: "en" | "uk") {
  const origin = new URL(baseURL);
  return {
    cookies: [
      {
        name: "roomly_locale",
        value: locale,
        domain: origin.hostname,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: origin.protocol === "https:",
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

export function futureOfficeSlot({
  weeks = 8,
  weekday = 2,
  hour = 11,
  minute = 0,
  durationMinutes = 60,
}: {
  weeks?: number;
  weekday?: number;
  hour?: number;
  minute?: number;
  durationMinutes?: number;
} = {}) {
  const start = DateTime.now()
    .setZone(OFFICE_TIME_ZONE)
    .plus({ weeks })
    .startOf("week")
    .plus({ days: weekday - 1 })
    .set({ hour, minute, second: 0, millisecond: 0 });

  return {
    officeDate: start.toISODate()!,
    startAt: start.toUTC().toISO()!,
    endAt: start.plus({ minutes: durationMinutes }).toUTC().toISO()!,
  };
}

export async function loginApi(
  request: APIRequestContext,
  email: "alex@room.test" | "maria@room.test" = "alex@room.test",
) {
  const response = await request.post("/api/auth/login", {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

export async function loginPage(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("alex@room.test");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/schedule/, { timeout: 30_000 });
}
