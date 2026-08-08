import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import uk from "../../messages/uk.json";
import { defaultLocale, isAppLocale } from "@/i18n/config";

function messageKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("localization messages", () => {
  it("keeps English and Ukrainian dictionaries structurally identical", () => {
    expect(messageKeys(uk).sort()).toEqual(messageKeys(en).sort());
  });

  it("uses Ukrainian as the safe default and rejects unsupported locales", () => {
    expect(defaultLocale).toBe("uk");
    expect(isAppLocale("uk")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("ru")).toBe(false);
  });
});
