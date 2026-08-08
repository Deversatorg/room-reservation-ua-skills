export const locales = ["uk", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "uk";
export const localeCookieName = "roomly_locale";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && locales.includes(value as AppLocale);
}
