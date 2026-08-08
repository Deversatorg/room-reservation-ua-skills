"use client";

import { Languages, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type AppLocale, locales } from "@/i18n/config";

export function LanguageSwitcher({ inverse = false }: { inverse?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Language");
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<AppLocale>();

  async function changeLocale(nextLocale: AppLocale) {
    if (nextLocale === locale || pendingLocale) return;
    setPendingLocale(nextLocale);

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (response.ok) router.refresh();
    } finally {
      setPendingLocale(undefined);
    }
  }

  return (
    <div
      role="group"
      aria-label={t("selectorLabel")}
      className={`inline-flex h-10 items-center gap-1 rounded-xl border p-1 ${
        inverse
          ? "border-white/15 bg-white/5"
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      <Languages className={`ml-1 hidden size-4 sm:block ${inverse ? "text-indigo-200" : "text-indigo-500"}`} />
      {locales.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            disabled={Boolean(pendingLocale)}
            aria-pressed={active}
            aria-label={t(option)}
            onClick={() => void changeLocale(option)}
            className={`grid h-7 min-w-8 place-items-center rounded-lg px-1.5 text-xs font-bold uppercase transition ${
              active
                ? inverse
                  ? "bg-white text-slate-950"
                  : "bg-slate-950 text-white"
                : inverse
                  ? "text-slate-300 hover:bg-white/10 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {pendingLocale === option ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              option
            )}
          </button>
        );
      })}
    </div>
  );
}
