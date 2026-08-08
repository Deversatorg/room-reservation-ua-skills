"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AppError({ reset }: { reset: () => void }) {
  const t = useTranslations("AppError");

  return (
    <main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">{t("title")}</h1>
        <p className="mt-2 leading-7 text-slate-500">
          {t("description")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
        >
          <RefreshCw className="size-4" /> {t("action")}
        </button>
      </div>
    </main>
  );
}
