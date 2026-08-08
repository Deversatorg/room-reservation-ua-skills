import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
} from "@/i18n/config";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: OFFICE_TIME_ZONE,
  };
});
