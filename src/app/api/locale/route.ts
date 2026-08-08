import { cookies } from "next/headers";

import {
  isAppLocale,
  localeCookieName,
} from "@/i18n/config";
import { readJson } from "@/lib/api";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const payload = await readJson(request);
  const locale =
    payload && typeof payload === "object" && "locale" in payload
      ? payload.locale
      : undefined;

  if (!isAppLocale(locale)) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Unsupported locale." } },
      { status: 422 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return Response.json({ locale });
}
